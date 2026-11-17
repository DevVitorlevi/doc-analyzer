import { execFileSync } from "node:child_process";
import { assertTestDatabase } from "../helpers/assert-test-database";

export default function globalSetup(): void {
  const databaseUrl = process.env.TEST_DATABASE_URL;

  assertTestDatabase(databaseUrl);

  execFileSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    },
  );
}
