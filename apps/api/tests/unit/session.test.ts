import { describe, expect, it } from "vitest";
import { loadEnv } from "@/config/env";
import { makeTestEnv } from "../helpers/fake-env";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
} from "@/modules/auth/session";

describe("Session JWT", () => {
  const env = loadEnv(makeTestEnv());

  it("creates and verifies a session token", async () => {
    const token = await createSessionToken("test-user-id", env);

    const userId = await verifySessionToken(token, env);

    expect(userId).toBe("test-user-id");
  });

  it("rejects a modified token", async () => {
    const token = await createSessionToken("test-user-id", env);

    const modifiedToken = `${token}invalid`;

    await expect(verifySessionToken(modifiedToken, env)).rejects.toThrow();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("test-user-id", env);

    const anotherEnv = loadEnv(
      makeTestEnv({
        SESSION_SECRET: "another-session-secret-with-more-than-32-chars",
      }),
    );

    await expect(verifySessionToken(token, anotherEnv)).rejects.toThrow();
  });

  it("uses a seven-day session duration", () => {
    expect(SESSION_TTL_SECONDS).toBe(604800);
  });
});
