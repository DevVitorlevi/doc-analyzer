export function assertTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is not defined");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("Invalid test database URL");
  }

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
}
