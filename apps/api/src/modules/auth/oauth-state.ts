import { randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function validateOAuthState(
  receivedState: string | undefined,
  storedState: string | undefined,
): boolean {
  if (!receivedState || !storedState) {
    return false;
  }

  const receivedBuffer = Buffer.from(receivedState);
  const storedBuffer = Buffer.from(storedState);

  if (receivedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, storedBuffer);
}
