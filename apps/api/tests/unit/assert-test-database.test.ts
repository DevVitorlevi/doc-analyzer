import { describe, expect, it } from "vitest";
import { assertTestDatabase } from "../helpers/assert-test-database";

describe("assertTestDatabase", () => {
  const validUrl =
    "postgresql://doc_analyzer:doc_analyzer@localhost:5433/doc_analyzer_test";

  it("accepts the test database URL", () => {
    expect(() => assertTestDatabase(validUrl)).not.toThrow();
  });

  it("rejects an undefined database URL", () => {
    expect(() => assertTestDatabase(undefined)).toThrow(
      "TEST_DATABASE_URL is not defined",
    );
  });

  it("rejects an invalid database URL", () => {
    expect(() => assertTestDatabase("invalid-url")).toThrow(
      "Invalid test database URL",
    );
  });

  it("rejects the development database", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://doc_analyzer:doc_analyzer@localhost:5432/doc_analyzer",
      ),
    ).toThrow('expected "doc_analyzer_test"');
  });

  it("rejects an unexpected database port", () => {
    expect(() =>
      assertTestDatabase(
        "postgresql://doc_analyzer:doc_analyzer@localhost:5432/doc_analyzer_test",
      ),
    ).toThrow('expected "5433"');
  });
});
