export function makeTestEnv(
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    PORT: "3333",
    API_URL: "http://localhost:3333",
    WEB_URL: "http://localhost:5173",

    DATABASE_URL:
      "postgresql://doc_analyzer:doc_analyzer@localhost:5433/doc_analyzer_test",
    TEST_DATABASE_URL:
      "postgresql://doc_analyzer:doc_analyzer@localhost:5433/doc_analyzer_test",

    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    GOOGLE_REDIRECT_URI: "http://localhost:3333/auth/google/callback",

    SESSION_SECRET: "test-session-secret-with-more-than-32-chars",

    S3_ENDPOINT: "",
    S3_REGION: "test-region",
    S3_ACCESS_KEY_ID: "test-access-key-id",
    S3_SECRET_ACCESS_KEY: "test-secret-access-key",
    S3_BUCKET: "test-bucket",

    OPENAI_API_KEY: "test-openai-api-key",

    ...overrides,
  };
}
