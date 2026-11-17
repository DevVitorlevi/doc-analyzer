import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "@/config/env";
import { StorageError } from "./storage-error";

export const DEFAULT_PRESIGNED_URL_TTL_SECONDS = 300;
export const MAX_PRESIGNED_URL_TTL_SECONDS = 604800;

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  getPresignedReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

type S3Settings = Pick<
  Env,
  | "S3_ENDPOINT"
  | "S3_REGION"
  | "S3_ACCESS_KEY_ID"
  | "S3_SECRET_ACCESS_KEY"
  | "S3_BUCKET"
>;

export function createS3Client(env: S3Settings): S3Client {
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function createS3Storage(
  env: S3Settings,
  client: S3Client = createS3Client(env),
): StorageProvider {
  const bucket = env.S3_BUCKET;

  return {
    async putObject({ key, body, contentType }: PutObjectInput): Promise<void> {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
          }),
        );
      } catch (error) {
        throw new StorageError("put", error);
      }
    },

    async getObject(key: string): Promise<Buffer> {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );

        if (!response.Body) {
          throw new Error("Storage response has no body");
        }

        return Buffer.from(await response.Body.transformToByteArray());
      } catch (error) {
        throw new StorageError("get", error);
      }
    },

    async getPresignedReadUrl(
      key: string,
      expiresInSeconds: number = DEFAULT_PRESIGNED_URL_TTL_SECONDS,
    ): Promise<string> {
      if (
        !Number.isInteger(expiresInSeconds) ||
        expiresInSeconds < 1 ||
        expiresInSeconds > MAX_PRESIGNED_URL_TTL_SECONDS
      ) {
        throw new StorageError(
          "presign",
          new RangeError("Invalid presigned URL expiration"),
        );
      }

      try {
        return await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: bucket, Key: key }),
          { expiresIn: expiresInSeconds },
        );
      } catch (error) {
        throw new StorageError("presign", error);
      }
    },

    async deleteObject(key: string): Promise<void> {
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
        );
      } catch (error) {
        throw new StorageError("delete", error);
      }
    },
  };
}
