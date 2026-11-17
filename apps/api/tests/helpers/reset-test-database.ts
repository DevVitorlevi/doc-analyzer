import { PrismaClient } from "@prisma/client";
import { assertTestDatabase } from "./assert-test-database";

export async function resetTestDatabase(): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  assertTestDatabase(databaseUrl);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    await prisma.$executeRaw`
      TRUNCATE TABLE "documents", "users"
      RESTART IDENTITY CASCADE
    `;
  } finally {
    await prisma.$disconnect();
  }
}
