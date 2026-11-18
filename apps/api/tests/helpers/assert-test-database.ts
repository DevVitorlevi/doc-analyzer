function parseDatabaseUrl(databaseUrl: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("Invalid database URL");
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid database protocol");
  }

  return parsedUrl;
}

export function assertTestDatabase(
  databaseUrl: string | undefined,
  variableName = "TEST_DATABASE_URL",
): asserts databaseUrl is string {
  if (!databaseUrl) {
    throw new Error(`${variableName} is not defined`);
  }

  const parsedUrl = parseDatabaseUrl(databaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\/+/, "");

  if (databaseName !== "doc_analyzer_test") {
    throw new Error(
      `Unsafe database: expected "doc_analyzer_test", received "${databaseName}"`,
    );
  }

  if (parsedUrl.port !== "5433") {
    throw new Error(
      `Unsafe database port: expected "5433", received "${parsedUrl.port}"`,
    );
  }

  const allowedHosts = ["localhost", "127.0.0.1", "[::1]"];

  if (!allowedHosts.includes(parsedUrl.hostname)) {
    throw new Error(`Unsafe database host: received "${parsedUrl.hostname}"`);
  }
}

export function assertIntegrationDatabase(
  applicationDatabaseUrl: string | undefined,
  testDatabaseUrl: string | undefined,
): void {
  assertTestDatabase(testDatabaseUrl);
  assertTestDatabase(applicationDatabaseUrl, "DATABASE_URL");

  const applicationDatabase = parseDatabaseUrl(applicationDatabaseUrl);
  const testDatabase = parseDatabaseUrl(testDatabaseUrl);

  const matches =
    applicationDatabase.protocol === testDatabase.protocol &&
    applicationDatabase.hostname === testDatabase.hostname &&
    applicationDatabase.port === testDatabase.port &&
    applicationDatabase.pathname === testDatabase.pathname;

  if (!matches) {
    throw new Error(
      "DATABASE_URL must point to the same protocol, host, port and database as TEST_DATABASE_URL",
    );
  }
}
