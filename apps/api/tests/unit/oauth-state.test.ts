import { describe, expect, it } from "vitest";
import {
  generateOAuthState,
  validateOAuthState,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
} from "@/modules/auth/oauth-state";

describe("Google OAuth state", () => {
  it("generates a random state", () => {
    const firstState = generateOAuthState();
    const secondState = generateOAuthState();

    expect(firstState).not.toBe(secondState);
    expect(firstState).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(firstState, "base64url")).toHaveLength(32);
  });

  it("accepts matching states", () => {
    const state = generateOAuthState();

    expect(validateOAuthState(state, state)).toBe(true);
  });

  it("rejects different states", () => {
    expect(validateOAuthState("state-a", "state-b")).toBe(false);
  });

  it("rejects missing states", () => {
    expect(validateOAuthState(undefined, "state")).toBe(false);
    expect(validateOAuthState("state", undefined)).toBe(false);
    expect(validateOAuthState(undefined, undefined)).toBe(false);
  });

  it("uses a ten-minute expiration period", () => {
    expect(GOOGLE_OAUTH_STATE_TTL_SECONDS).toBe(600);
  });
});
