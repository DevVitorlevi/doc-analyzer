import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { createFakeStorage } from "../helpers/fake-storage";
import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { loginAndGetCookie } from "../helpers/login";

const storageFake = createFakeStorage();

describe("DELETE /documents/:id", () => {
  const { getApp } = useIntegrationDatabase({
    storage: storageFake.storage,
  });

  beforeEach(() => {
    storageFake.reset();
  });

  async function createUser() {
    return getApp().prisma.user.create({
      data: {
        googleId: randomUUID(),
        email: `${randomUUID()}@example.com`,
        name: "Integration Test User",
      },
    });
  }

  async function createDocument(userId: string) {
    return getApp().prisma.document.create({
      data: {
        userId,
        title: "Contrato",
        instruction: "Resuma o documento",
        analysis: "Resumo do contrato",
        status: "COMPLETED",
        s3Key: `${userId}/${randomUUID()}.txt`,
        originalName: "contrato.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
      },
    });
  }

  it("rejects an unauthenticated request", async () => {
    const response = await getApp().inject({
      method: "DELETE",
      url: `/documents/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("deletes the document from storage and database", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createDocument(user.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    const response = await getApp().inject({
      method: "DELETE",
      url: `/documents/${document.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");

    const deletedDocument = await getApp().prisma.document.findUnique({
      where: { id: document.id },
    });

    expect(deletedDocument).toBeNull();
    expect(storageFake.objects.has(document.s3Key)).toBe(false);
  });

  it("returns 404 when the document does not exist", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "DELETE",
      url: `/documents/${randomUUID()}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when the document belongs to another user", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const anotherUser = await createUser();
    const document = await createDocument(anotherUser.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    const response = await getApp().inject({
      method: "DELETE",
      url: `/documents/${document.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");

    const existingDocument = await getApp().prisma.document.findUnique({
      where: { id: document.id },
    });

    expect(existingDocument).not.toBeNull();
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });

  it("rejects an invalid document UUID", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "DELETE",
      url: "/documents/invalid-id",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 502 and preserves the database record when storage deletion fails", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createDocument(user.id);

    storageFake.objects.set(document.s3Key, {
      body: Buffer.from("document content"),
      contentType: document.mimeType,
    });

    storageFake.failures.delete = true;

    const response = await getApp().inject({
      method: "DELETE",
      url: `/documents/${document.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("STORAGE_ERROR");

    const existingDocument = await getApp().prisma.document.findUnique({
      where: { id: document.id },
    });

    expect(existingDocument).not.toBeNull();
    expect(storageFake.objects.has(document.s3Key)).toBe(true);
  });
});
