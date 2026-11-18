import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { loginAndGetCookie } from "../helpers/login";

import { SESSION_COOKIE } from "@/modules/auth/session";

const SESSION_SECRET = "test-session-secret-with-more-than-32-chars";

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

  it("rejects a tampered session token", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const token = cookie.slice(`${SESSION_COOKIE}=`.length);
    const [header, payload, signature] = token.split(".");

    if (!header || !payload || !signature) {
      throw new Error("Invalid test session token");
    }

    const tamperedSignature =
      signature.slice(0, -1) + (signature.endsWith("a") ? "b" : "a");

    const response = await getApp().inject({
      method: "GET",
      url: "/me",
      headers: {
        cookie: `${SESSION_COOKIE}=${header}.${payload}.${tamperedSignature}`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an expired session token", async () => {
    const app = getApp();
    const user = await app.prisma.user.create({
      data: {
        googleId: "expired-session-user",
        email: "expired@example.com",
        name: "Expired User",
      },
    });

    const now = Math.floor(Date.now() / 1000);

    const expiredToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("http://localhost:3333")
      .setAudience("http://localhost:3333")
      .setSubject(user.id)
      .setIssuedAt(now - 120)
      .setExpirationTime(now - 60)
      .sign(new TextEncoder().encode(SESSION_SECRET));

    const response = await app.inject({
      method: "GET",
      url: "/me",
      headers: {
        cookie: `${SESSION_COOKIE}=${expiredToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a valid session when its user no longer exists", async () => {
    const app = getApp();
    const cookie = await loginAndGetCookie(app);

    const user = await app.prisma.user.findFirstOrThrow();

    await app.prisma.user.delete({
      where: { id: user.id },
    });

    const response = await app.inject({
      method: "GET",
      url: "/me",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
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

  it("rejects logout without a session", async () => {
    const response = await getApp().inject({
      method: "POST",
      url: "/auth/logout",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });
});
