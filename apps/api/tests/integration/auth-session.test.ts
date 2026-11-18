import { describe, expect, it } from "vitest";

import { useIntegrationDatabase } from "../helpers/integration-hooks";

import { SESSION_COOKIE } from "@/modules/auth/session";

describe("Authentication session", () => {
  const { getApp } = useIntegrationDatabase();

  async function completeGoogleLogin() {
    const app = getApp();

    const startResponse = await app.inject({
      method: "GET",
      url: "/auth/google",
    });

    const authorizationUrl = new URL(startResponse.headers.location!);
    const state = authorizationUrl.searchParams.get("state");

    if (!state) {
      throw new Error("OAuth state was not generated");
    }

    const callbackResponse = await app.inject({
      method: "GET",
      url: `/auth/google/callback?code=test-code&state=${encodeURIComponent(state)}`,
      headers: {
        cookie: `google_oauth_state=${state}`,
      },
    });

    const sessionCookie = callbackResponse.cookies.find(
      (cookie) => cookie.name === SESSION_COOKIE,
    );

    if (!sessionCookie) {
      throw new Error("Session cookie was not generated");
    }

    return {
      callbackResponse,
      sessionCookie,
    };
  }

  it("rejects an invalid OAuth state with the standard error format", async () => {
    const app = getApp();

    const response = await app.inject({
      method: "GET",
      url: "/auth/google/callback?code=test-code&state=wrong-state",
      headers: {
        cookie: "google_oauth_state=expected-state",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Solicitação de autenticação inválida.",
      },
    });

    expect(await app.prisma.user.count()).toBe(0);
  });

  it("rejects GET /me without a valid session using the standard error format", async () => {
    const response = await getApp().inject({
      method: "GET",
      url: "/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Autenticação necessária.",
      },
    });
  });

  it("creates a user and an authenticated session", async () => {
    const app = getApp();

    const { callbackResponse, sessionCookie } = await completeGoogleLogin();

    expect(callbackResponse.statusCode).toBe(302);
    expect(callbackResponse.headers.location).toBe("http://localhost:5173");

    expect(sessionCookie.httpOnly).toBe(true);
    expect(sessionCookie.maxAge).toBe(604800);

    const meResponse = await app.inject({
      method: "GET",
      url: "/me",
      headers: {
        cookie: `${SESSION_COOKIE}=${sessionCookie.value}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toMatchObject({
      name: "Test User",
      email: "test@example.com",
      picture: null,
    });

    expect(await app.prisma.user.count()).toBe(1);
  });

  it("logs out and clears the session cookie", async () => {
    const { sessionCookie } = await completeGoogleLogin();

    const response = await getApp().inject({
      method: "POST",
      url: "/auth/logout",
      headers: {
        cookie: `${SESSION_COOKIE}=${sessionCookie.value}`,
      },
    });

    expect(response.statusCode).toBe(204);
    expect(String(response.headers["set-cookie"])).toContain(SESSION_COOKIE);
    expect(String(response.headers["set-cookie"])).toMatch(/Max-Age=0/i);
  });
});
