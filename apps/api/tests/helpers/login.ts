import type { FastifyInstance } from "fastify";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/modules/auth/oauth-state";
import { SESSION_COOKIE } from "@/modules/auth/session";

export async function loginAndGetCookie(app: FastifyInstance): Promise<string> {
  const startResponse = await app.inject({
    method: "GET",
    url: "/auth/google",
  });

  const location = startResponse.headers.location;

  if (typeof location !== "string") {
    throw new Error("Authorization redirect was not generated");
  }

  const state = new URL(location).searchParams.get("state");

  if (!state) {
    throw new Error("OAuth state was not generated");
  }

  const callbackResponse = await app.inject({
    method: "GET",
    url: `/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,
    headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}` },
  });

  const sessionCookie = callbackResponse.cookies.find(
    (cookie) => cookie.name === SESSION_COOKIE,
  );

  if (!sessionCookie) {
    throw new Error("Session cookie was not generated");
  }

  return `${SESSION_COOKIE}=${sessionCookie.value}`;
}
