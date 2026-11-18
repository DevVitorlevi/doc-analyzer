import { describe, expect, it } from "vitest";

import type { GoogleOAuthProvider } from "@/modules/auth/google-oauth";

import { useIntegrationDatabase } from "../helpers/integration-hooks";

const fakeOAuthProvider: GoogleOAuthProvider = {
  getAuthorizationUrl(state: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    url.searchParams.set("client_id", "test-google-client-id");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "openid email profile");

    return url.toString();
  },

  async exchangeCode(code: string): Promise<string> {
    if (code === "exchange-error") {
      throw new Error("OAuth exchange failed");
    }

    return code;
  },

  async verifyIdToken(idToken: string) {
    if (idToken === "verify-error") {
      throw new Error("OAuth token verification failed");
    }

    if (idToken === "updated-user") {
      return {
        googleId: "test-google-user",
        email: "updated@example.com",
        name: "Updated Test User",
        picture: "https://example.com/updated-picture.png",
      };
    }

    return {
      googleId: "test-google-user",
      email: "test@example.com",
      name: "Test User",
      picture: null,
    };
  },
};

describe("Google authentication", () => {
  const { getApp } = useIntegrationDatabase({
    googleOAuthProvider: fakeOAuthProvider,
  });

  async function startAuthorization() {
    const response = await getApp().inject({
      method: "GET",
      url: "/auth/google",
    });

    const location = response.headers.location;

    if (!location) {
      throw new Error("Authorization redirect was not generated");
    }

    const state = new URL(location).searchParams.get("state");

    if (!state) {
      throw new Error("OAuth state was not generated");
    }

    return {
      state,
      cookie: `google_oauth_state=${state}`,
    };
  }

  async function callback(state: string, cookie: string, query: string) {
    return getApp().inject({
      method: "GET",
      url: `/auth/google/callback?state=${encodeURIComponent(state)}${query}`,
      headers: { cookie },
    });
  }

  it("GET /auth/google redirects to Google and sets the state cookie", async () => {
    const response = await getApp().inject({
      method: "GET",
      url: "/auth/google",
    });

    expect(response.statusCode).toBe(302);

    const location = response.headers.location;

    expect(location).toBeDefined();

    const authorizationUrl = new URL(location!);

    expect(authorizationUrl.origin).toBe("https://accounts.google.com");
    expect(authorizationUrl.searchParams.get("client_id")).toBe(
      "test-google-client-id",
    );
    expect(authorizationUrl.searchParams.get("scope")).toBe(
      "openid email profile",
    );

    const state = authorizationUrl.searchParams.get("state");

    expect(state).toBeTruthy();
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);

    const stateCookie = response.cookies.find(
      (cookie) => cookie.name === "google_oauth_state",
    );

    expect(stateCookie).toBeDefined();
    expect(stateCookie?.value).toBe(state);
    expect(stateCookie?.httpOnly).toBe(true);
    expect(stateCookie?.sameSite).toBe("Lax");
    expect(stateCookie?.path).toBe("/auth/google/callback");
    expect(stateCookie?.maxAge).toBe(600);
    expect(response.headers["set-cookie"]).not.toMatch(/;\s*Secure(?:;|$)/i);
  });

  it("generates a different state for each authorization attempt", async () => {
    const firstResponse = await getApp().inject({
      method: "GET",
      url: "/auth/google",
    });

    const secondResponse = await getApp().inject({
      method: "GET",
      url: "/auth/google",
    });

    const firstState = new URL(
      firstResponse.headers.location!,
    ).searchParams.get("state");

    const secondState = new URL(
      secondResponse.headers.location!,
    ).searchParams.get("state");

    expect(firstState).toBeTruthy();
    expect(secondState).toBeTruthy();
    expect(firstState).not.toBe(secondState);
  });

  it("rejects an OAuth callback containing an error", async () => {
    const { state, cookie } = await startAuthorization();

    const response = await callback(state, cookie, "&error=access_denied");

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(await getApp().prisma.user.count()).toBe(0);
  });

  it("rejects an OAuth callback without an authorization code", async () => {
    const { state, cookie } = await startAuthorization();

    const response = await callback(state, cookie, "");

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(await getApp().prisma.user.count()).toBe(0);
  });

  it("rejects an OAuth code exchange failure", async () => {
    const { state, cookie } = await startAuthorization();

    const response = await callback(state, cookie, "&code=exchange-error");

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
    expect(await getApp().prisma.user.count()).toBe(0);
  });

  it("updates an existing user instead of creating a duplicate on repeated login", async () => {
    const firstAuthorization = await startAuthorization();

    const firstResponse = await callback(
      firstAuthorization.state,
      firstAuthorization.cookie,
      "&code=test-code",
    );

    expect(firstResponse.statusCode).toBe(302);

    const secondAuthorization = await startAuthorization();

    const secondResponse = await callback(
      secondAuthorization.state,
      secondAuthorization.cookie,
      "&code=updated-user",
    );

    expect(secondResponse.statusCode).toBe(302);
    const users = await getApp().prisma.user.findMany();

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      googleId: "test-google-user",
      email: "updated@example.com",
      name: "Updated Test User",
      picture: "https://example.com/updated-picture.png",
    });
  });
});
