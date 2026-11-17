import { SignJWT, jwtVerify } from "jose";
import type { Env } from "@/config/env";

export const SESSION_COOKIE = "doc_analyzer_session";

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function getSessionSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  userId: string,
  env: Env,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(env.API_URL)
    .setAudience(env.API_URL)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret(env.SESSION_SECRET));
}

export async function verifySessionToken(
  token: string,
  env: Env,
): Promise<string> {
  const { payload } = await jwtVerify(
    token,
    getSessionSecret(env.SESSION_SECRET),
    {
      algorithms: ["HS256"],
      issuer: env.API_URL,
      audience: env.API_URL,
    },
  );

  if (!payload.sub) {
    throw new Error("Session token has no subject");
  }

  return payload.sub;
}
