import type { PrismaClient } from "@prisma/client";
import type { GoogleOAuthProvider } from "@/modules/auth/google-oauth";
import type { AuthenticatedUser } from "@/modules/auth/auth-types";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    googleOAuthProvider: GoogleOAuthProvider;
  }

  interface FastifyRequest {
    currentUser: AuthenticatedUser | null;
  }
}
