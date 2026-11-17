import { OAuth2Client } from "google-auth-library";
import type { Env } from "@/config/env";

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface GoogleOAuthProvider {
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<string>;
  verifyIdToken(idToken: string): Promise<GoogleIdentity>;
}

export function createGoogleOAuthProvider(env: Env): GoogleOAuthProvider {
  const client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  return {
    getAuthorizationUrl(state: string): string {
      return client.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        state,
        prompt: "select_account",
      });
    },

    async exchangeCode(code: string): Promise<string> {
      const { tokens } = await client.getToken(code);

      if (!tokens.id_token) {
        throw new Error("Google did not return an ID token");
      }

      return tokens.id_token;
    },

    async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (
        !payload?.sub ||
        !payload.email ||
        payload.email_verified !== true ||
        !payload.name
      ) {
        throw new Error("Invalid Google identity");
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture ?? null,
      };
    },
  };
}
