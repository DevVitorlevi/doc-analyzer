import { describe, expect, it } from "vitest";
import { useIntegrationDatabase } from "../helpers/integration-hooks";

describe("Google authentication", () => {
  const { getApp } = useIntegrationDatabase();

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

    const cookies = response.cookies;
    const stateCookie = cookies.find(
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
});
