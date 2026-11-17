import type { GoogleOAuthProvider } from "@/modules/auth/google-oauth";

export function createFakeGoogleOAuthProvider(): GoogleOAuthProvider {
  return {
    getAuthorizationUrl(state: string): string {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

      url.searchParams.set("client_id", "test-google-client-id");
      url.searchParams.set("state", state);
      url.searchParams.set("scope", "openid email profile");

      return url.toString();
    },

    async exchangeCode(): Promise<string> {
      return "test-google-id-token";
    },

    async verifyIdToken() {
      return {
        googleId: "test-google-user",
        email: "test@example.com",
        name: "Test User",
        picture: null,
      };
    },
  };
}
