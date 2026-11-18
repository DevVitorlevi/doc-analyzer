import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { assertTestDatabase } from "../helpers/assert-test-database";
import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { resetTestDatabase } from "../helpers/reset-test-database";
import { createIntegrationEnv } from "../helpers/setup-integration";

describe("Integration tests", () => {
  const { getApp } = useIntegrationDatabase();

  it("GET /health responds 200 without authentication", async () => {
    const response = await getApp().inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ status: string }>()).toEqual({
      status: "ok",
    });
  });

  it("uses TEST_DATABASE_URL as the application database URL", () => {
    const env = createIntegrationEnv();

    expect(env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
    expect(env.TEST_DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  });

  it("clears users and documents from the test database", async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("TEST_DATABASE_URL is not defined");
    }

    assertTestDatabase(databaseUrl);

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      const user = await prisma.user.create({
        data: {
          googleId: "test-google-user",
          email: "test@example.com",
          name: "Test User",
        },
      });

      await prisma.document.create({
        data: {
          userId: user.id,
          title: "Test document",
          instruction: "Test instruction",
          s3Key: "test/document.pdf",
          originalName: "document.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
        },
      });

      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.document.count()).toBe(1);

      await resetTestDatabase();

      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.document.count()).toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  });
});
