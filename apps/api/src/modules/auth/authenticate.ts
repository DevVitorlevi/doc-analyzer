import type { FastifyRequest } from "fastify";

import type { Env } from "@/config/env";
import { AppError } from "@/shared/errors/app-error";

import type { AuthenticatedUser } from "./auth-types";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export function authenticate(env: Env) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = request.cookies[SESSION_COOKIE];

    if (!token) {
      throw new AppError("UNAUTHORIZED", "Autenticação necessária.", 401);
    }

    let userId: string;

    try {
      userId = await verifySessionToken(token, env);
    } catch {
      throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", 401);
    }

    const user = await request.server.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
      },
    });

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", 401);
    }

    const authenticatedUser: AuthenticatedUser = user;

    request.currentUser = authenticatedUser;
  };
}
