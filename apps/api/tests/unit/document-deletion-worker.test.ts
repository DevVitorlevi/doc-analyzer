import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentDeletionWorker } from "@/modules/documents/document-deletion-worker";

import { createFakeDocumentRepository } from "../helpers/fake-document-repository";
import { createFakeStorage } from "../helpers/fake-storage";

const USER_ID = "user-1";
const DOCUMENT_ID = "document-1";

function createLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

async function createPendingDocument(
  repository: ReturnType<typeof createFakeDocumentRepository>["repository"],
) {
  const document = await repository.create({
    id: DOCUMENT_ID,
    userId: USER_ID,
    title: "Contrato",
    instruction: "Resuma o documento",
    s3Key: `${USER_ID}/${DOCUMENT_ID}.txt`,
    originalName: "contrato.txt",
    mimeType: "text/plain",
    sizeBytes: 100,
  });

  await repository.requestDeletion(document.id, USER_ID);

  return document;
}

describe("Document deletion worker", () => {
  let repositoryFake: ReturnType<typeof createFakeDocumentRepository>;
  let storageFake: ReturnType<typeof createFakeStorage>;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    repositoryFake = createFakeDocumentRepository();
    storageFake = createFakeStorage();
    logger = createLogger();
  });

  function makeWorker() {
    return createDocumentDeletionWorker({
      documents: repositoryFake.repository,
      storage: storageFake.storage,
      logger,
      pollIntervalMs: 5_000,
      leaseDurationMs: 60_000,
    });
  }

  it("deletes the storage object and database record successfully", async () => {
    const document = await createPendingDocument(repositoryFake.repository);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    const worker = makeWorker();

    await expect(worker.processPendingDeletions()).resolves.toBeUndefined();

    expect(storageFake.objects.has(document.s3Key)).toBe(false);
    expect(repositoryFake.records.has(document.id)).toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("keeps the document pending and schedules a retry when storage deletion fails", async () => {
    const document = await createPendingDocument(repositoryFake.repository);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    storageFake.failures.delete = true;

    const startedAt = Date.now();
    const worker = makeWorker();

    await expect(worker.processPendingDeletions()).resolves.toBeUndefined();

    const record = repositoryFake.records.get(document.id);

    expect(record).toBeDefined();
    expect(record?.status).toBe("DELETION_PENDING");
    expect(record?.deletionAttempts).toBe(1);
    expect(record?.deletionLeaseUntil).toBeNull();
    expect(record?.deletionNextAttemptAt).toBeInstanceOf(Date);
    expect(record?.deletionNextAttemptAt!.getTime()).toBeGreaterThan(startedAt);
    expect(record?.deletionNextAttemptAt!.getTime()).toBeLessThanOrEqual(
      Date.now() + 5_000,
    );
    expect(record?.deletionError).toBeTruthy();

    expect(storageFake.objects.has(document.s3Key)).toBe(true);
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("increases the retry delay exponentially on subsequent failures", async () => {
    const document = await createPendingDocument(repositoryFake.repository);

    storageFake.failures.delete = true;

    const worker = makeWorker();

    await worker.processPendingDeletions();

    const firstRecord = repositoryFake.records.get(document.id);

    expect(firstRecord?.deletionAttempts).toBe(1);

    const firstRetryAt = firstRecord?.deletionNextAttemptAt;

    expect(firstRetryAt).toBeInstanceOf(Date);

    repositoryFake.records.set(document.id, {
      ...firstRecord!,
      deletionNextAttemptAt: new Date(Date.now() - 1_000),
    });

    const secondAttemptStartedAt = Date.now();

    await worker.processPendingDeletions();

    const secondRecord = repositoryFake.records.get(document.id);

    expect(secondRecord?.status).toBe("DELETION_PENDING");
    expect(secondRecord?.deletionAttempts).toBe(2);
    expect(secondRecord?.deletionLeaseUntil).toBeNull();

    expect(secondRecord?.deletionNextAttemptAt).toBeInstanceOf(Date);
    expect(
      secondRecord?.deletionNextAttemptAt!.getTime(),
    ).toBeGreaterThanOrEqual(secondAttemptStartedAt + 9_000);
    expect(secondRecord?.deletionNextAttemptAt!.getTime()).toBeLessThanOrEqual(
      Date.now() + 10_000,
    );

    expect(storageFake.objects.has(document.s3Key)).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("does not process documents whose retry time has not arrived", async () => {
    const document = await createPendingDocument(repositoryFake.repository);

    const futureAttempt = new Date(Date.now() + 60_000);

    repositoryFake.records.set(document.id, {
      ...repositoryFake.records.get(document.id)!,
      deletionNextAttemptAt: futureAttempt,
    });

    const worker = makeWorker();

    await expect(worker.processPendingDeletions()).resolves.toBeUndefined();

    expect(repositoryFake.records.has(document.id)).toBe(true);
    expect(repositoryFake.records.get(document.id)?.deletionAttempts).toBe(0);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
