import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { createFakeStorage } from "../helpers/fake-storage";
import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { loginAndGetCookie } from "../helpers/login";

const storageFake = createFakeStorage();

describe("GET /documents", () => {
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

  async function createDocument(
    userId: string,
    options: {
      title?: string;
      createdAt?: Date;
    } = {},
  ) {
    return getApp().prisma.document.create({
      data: {
        userId,
        title: options.title ?? "Contrato",
        instruction: "Resuma o documento",
        s3Key: `${userId}/${randomUUID()}.txt`,
        originalName: "contrato.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        createdAt: options.createdAt,
      },
    });
  }

  it("rejects an unauthenticated request", async () => {
    const response = await getApp().inject({
      method: "GET",
      url: "/documents",
    });

    expect(response.statusCode).toBe(401);
  });

  it("lists only the authenticated user's documents", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const authenticatedUser = await getApp().prisma.user.findFirstOrThrow();
    const anotherUser = await createUser();

    await createDocument(authenticatedUser.id, {
      title: "Documento antigo",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    await createDocument(authenticatedUser.id, {
      title: "Documento recente",
      createdAt: new Date("2026-02-01T10:00:00.000Z"),
    });

    await createDocument(anotherUser.id, {
      title: "Documento de outro usuário",
    });

    const response = await getApp().inject({
      method: "GET",
      url: "/documents",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body).toHaveLength(2);
    expect(body.map((document: { title: string }) => document.title)).toEqual([
      "Documento recente",
      "Documento antigo",
    ]);

    expect(body[0]).toMatchObject({
      title: "Documento recente",
      mimeType: "text/plain",
      sizeBytes: 100,
      status: "PROCESSING",
    });

    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("createdAt");
    expect(body[0]).not.toHaveProperty("s3Key");
    expect(body[0]).not.toHaveProperty("userId");
    expect(body[0]).not.toHaveProperty("instruction");
    expect(body[0]).not.toHaveProperty("fileUrl");
  });

  it("returns an empty array when the user has no documents", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "GET",
      url: "/documents",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

describe("GET /documents/:id", () => {
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
      method: "GET",
      url: `/documents/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns document details and a temporary file URL", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createDocument(user.id);

    const response = await getApp().inject({
      method: "GET",
      url: `/documents/${document.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: document.id,
      title: document.title,
      instruction: document.instruction,
      status: "COMPLETED",
      analysis: document.analysis,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      fileUrl: `https://fake-storage.test/${document.s3Key}`,
    });

    expect(response.json()).toHaveProperty("createdAt");
    expect(response.json()).not.toHaveProperty("s3Key");
    expect(response.json()).not.toHaveProperty("userId");
  });

  it("returns 404 when the document does not exist", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "GET",
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

    const response = await getApp().inject({
      method: "GET",
      url: `/documents/${document.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });

  it("rejects an invalid document UUID", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "GET",
      url: "/documents/invalid-id",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 502 when generating the temporary URL fails", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const user = await getApp().prisma.user.findFirstOrThrow();
    const document = await createDocument(user.id);

    storageFake.failures.presign = true;

    const response = await getApp().inject({
      method: "GET",
      url: `/documents/${document.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("STORAGE_ERROR");
  });
});
