import type { FastifyPluginCallback } from "fastify";
import type { Env } from "@/config/env";
import {
  generateOAuthState,
  validateOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
} from "./oauth-state";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "./session";
import { authenticate } from "./authenticate";

export function authRoutes(env: Env): FastifyPluginCallback {
  return (app, _options, done) => {
    const stateCookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/auth/google/callback",
    };

    const sessionCookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    app.get("/auth/google", async (_request, reply) => {
      const state = generateOAuthState();

      reply.setCookie(GOOGLE_OAUTH_STATE_COOKIE, state, {
        ...stateCookieOptions,
        maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
      });

      const authorizationUrl =
        app.googleOAuthProvider.getAuthorizationUrl(state);

      return reply.redirect(authorizationUrl);
    });

    app.get("/auth/google/callback", async (request, reply) => {
      const query = request.query as {
        code?: unknown;
        state?: unknown;
        error?: unknown;
      };

      const receivedState =
        typeof query.state === "string" ? query.state : undefined;

      const storedState = request.cookies[GOOGLE_OAUTH_STATE_COOKIE];

      reply.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, stateCookieOptions);

      if (!validateOAuthState(receivedState, storedState)) {
        return reply.code(400).send({
          error: "Invalid authentication request",
        });
      }

      if (
        query.error !== undefined ||
        typeof query.code !== "string" ||
        !query.code
      ) {
        return reply.code(400).send({
          error: "Google authentication was not completed",
        });
      }

      let identity;

      try {
        const idToken = await app.googleOAuthProvider.exchangeCode(query.code);

        identity = await app.googleOAuthProvider.verifyIdToken(idToken);
      } catch {
        request.log.warn("Google OAuth verification failed");

        return reply.code(401).send({
          error: "Google authentication failed",
        });
      }

      const user = await app.prisma.user.upsert({
        where: {
          googleId: identity.googleId,
        },
        update: {
          email: identity.email,
          name: identity.name,
          picture: identity.picture,
        },
        create: {
          googleId: identity.googleId,
          email: identity.email,
          name: identity.name,
          picture: identity.picture,
        },
      });

      const sessionToken = await createSessionToken(user.id, env);

      reply.setCookie(SESSION_COOKIE, sessionToken, {
        ...sessionCookieOptions,
        maxAge: SESSION_TTL_SECONDS,
      });

      return reply.redirect(env.WEB_URL);
    });

    app.get(
      "/me",
      {
        preHandler: authenticate(env),
      },
      async (request, reply) => {
        const user = request.currentUser;

        if (!user) {
          return reply.code(401).send({
            error: "Unauthorized",
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
        };
      },
    );

    app.post(
      "/auth/logout",
      {
        preHandler: authenticate(env),
      },
      async (_request, reply) => {
        reply.clearCookie(SESSION_COOKIE, sessionCookieOptions);

        return reply.code(204).send();
      },
    );

    done();
  };
}
