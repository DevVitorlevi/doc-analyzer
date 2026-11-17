import { randomUUID } from "node:crypto";
import { loadEnv } from "../src/config/env";
import { createS3Storage } from "../src/integrations/storage/s3-storage";

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const storage = createS3Storage(env);
  const key = `smoke-test/${randomUUID()}.txt`;
  const content = `smoke test ${new Date().toISOString()}`;
  let uploaded = false;

  try {
    await storage.putObject({
      key,
      body: Buffer.from(content, "utf-8"),
      contentType: "text/plain",
    });
    uploaded = true;
    log("1/4 upload: ok");

    const downloaded = await storage.getObject(key);
    if (downloaded.toString("utf-8") !== content) {
      throw new Error("Downloaded content differs from uploaded content");
    }
    log("2/4 read: ok");

    const url = await storage.getPresignedReadUrl(key, 60);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok || (await response.text()) !== content) {
      throw new Error(`Presigned URL failed with status ${response.status}`);
    }
    log("3/4 presigned URL: ok");
  } finally {
    if (uploaded) {
      await storage.deleteObject(key);
      log("4/4 delete: ok");
    }
  }

  let stillExists = true;
  try {
    await storage.getObject(key);
  } catch {
    stillExists = false;
  }
  if (stillExists) {
    throw new Error("Object still readable after delete");
  }
  log("confirmed: object no longer exists");
}

main().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : "Unknown failure";
  const causeName =
    error instanceof Error && error.cause instanceof Error
      ? ` (cause: ${error.cause.name})`
      : "";
  process.stderr.write(`Smoke test failed: ${name}: ${message}${causeName}\n`);
  process.exit(1);
});
