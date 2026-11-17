import { describe, expect, it, vi } from "vitest";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { loadEnv } from "@/config/env";
import {
  createS3Client,
  createS3Storage,
  DEFAULT_PRESIGNED_URL_TTL_SECONDS,
} from "@/integrations/storage/s3-storage";
import { StorageError } from "@/integrations/storage/storage-error";
import { makeTestEnv } from "../helpers/fake-env";

const env = loadEnv(makeTestEnv());

function makeFakeClient(send: ReturnType<typeof vi.fn>): S3Client {
  return { send } as unknown as S3Client;
}

describe("S3 storage", () => {
  describe("putObject", () => {
    it("sends a PutObjectCommand with bucket, key, body and content type", async () => {
      const send = vi.fn().mockResolvedValue({});
      const storage = createS3Storage(env, makeFakeClient(send));
      const body = Buffer.from("hello");

      await storage.putObject({
        key: "documents/abc.txt",
        body,
        contentType: "text/plain",
      });

      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0]?.[0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toEqual({
        Bucket: "test-bucket",
        Key: "documents/abc.txt",
        Body: body,
        ContentType: "text/plain",
      });
    });

    it("wraps provider failures in StorageError without leaking details", async () => {
      const cause = new Error("secret-provider-detail");
      const send = vi.fn().mockRejectedValue(cause);
      const storage = createS3Storage(env, makeFakeClient(send));

      const promise = storage.putObject({
        key: "k",
        body: Buffer.from("x"),
        contentType: "text/plain",
      });

      await expect(promise).rejects.toBeInstanceOf(StorageError);
      await expect(promise).rejects.toMatchObject({
        operation: "put",
        cause,
      });
      await expect(promise).rejects.not.toThrow(/secret-provider-detail/);
    });
  });

  describe("getObject", () => {
    it("returns the object content as a Buffer", async () => {
      const send = vi.fn().mockResolvedValue({
        Body: {
          transformToByteArray: async () => new TextEncoder().encode("content"),
        },
      });
      const storage = createS3Storage(env, makeFakeClient(send));

      const result = await storage.getObject("documents/abc.txt");

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString("utf-8")).toBe("content");
      const command = send.mock.calls[0]?.[0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({
        Bucket: "test-bucket",
        Key: "documents/abc.txt",
      });
    });

    it("fails with StorageError when the response has no body", async () => {
      const send = vi.fn().mockResolvedValue({});
      const storage = createS3Storage(env, makeFakeClient(send));

      await expect(storage.getObject("k")).rejects.toMatchObject({
        name: "StorageError",
        operation: "get",
      });
    });

    it("wraps provider failures in StorageError", async () => {
      const send = vi.fn().mockRejectedValue(new Error("NoSuchKey"));
      const storage = createS3Storage(env, makeFakeClient(send));

      await expect(storage.getObject("k")).rejects.toMatchObject({
        name: "StorageError",
        operation: "get",
      });
    });
  });

  describe("deleteObject", () => {
    it("sends a DeleteObjectCommand with bucket and key", async () => {
      const send = vi.fn().mockResolvedValue({});
      const storage = createS3Storage(env, makeFakeClient(send));

      await storage.deleteObject("documents/abc.txt");

      const command = send.mock.calls[0]?.[0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toEqual({
        Bucket: "test-bucket",
        Key: "documents/abc.txt",
      });
    });

    it("wraps provider failures in StorageError", async () => {
      const send = vi.fn().mockRejectedValue(new Error("boom"));
      const storage = createS3Storage(env, makeFakeClient(send));

      await expect(storage.deleteObject("k")).rejects.toMatchObject({
        name: "StorageError",
        operation: "delete",
      });
    });
  });

  describe("getPresignedReadUrl", () => {
    it("signs a read URL locally with the default expiration", async () => {
      const storage = createS3Storage(env);

      const url = new URL(await storage.getPresignedReadUrl("documents/a.pdf"));

      expect(url.pathname).toContain("documents/a.pdf");
      expect(url.host).toContain("test-bucket");
      expect(url.searchParams.get("X-Amz-Expires")).toBe(
        String(DEFAULT_PRESIGNED_URL_TTL_SECONDS),
      );
      expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
    });

    it("accepts a custom expiration", async () => {
      const storage = createS3Storage(env);

      const url = new URL(await storage.getPresignedReadUrl("k", 60));

      expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    });

    it.each([0, -1, 1.5, 604801])(
      "rejects the invalid expiration %s with StorageError",
      async (expiresInSeconds) => {
        const storage = createS3Storage(env);

        await expect(
          storage.getPresignedReadUrl("k", expiresInSeconds),
        ).rejects.toMatchObject({
          name: "StorageError",
          operation: "presign",
        });
      },
    );
  });

  describe("createS3Client", () => {
    it("uses the AWS default endpoint when S3_ENDPOINT is empty", async () => {
      const client = createS3Client(env);

      expect(await client.config.region()).toBe("test-region");
      expect(client.config.endpoint).toBeUndefined();
    });

    it("uses the configured S3-compatible endpoint", async () => {
      const customEnv = loadEnv(
        makeTestEnv({ S3_ENDPOINT: "https://s3.example-provider.test" }),
      );
      const client = createS3Client(customEnv);

      const endpoint = await client.config.endpoint?.();

      expect(endpoint?.hostname).toBe("s3.example-provider.test");
    });

    it("only calculates and validates checksums when required", async () => {
      const client = createS3Client(env);

      expect(await client.config.requestChecksumCalculation()).toBe(
        "WHEN_REQUIRED",
      );
      expect(await client.config.responseChecksumValidation()).toBe(
        "WHEN_REQUIRED",
      );
    });
  });
});
