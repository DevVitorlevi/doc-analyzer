import type { FastifyReply, FastifyRequest } from "fastify";
import type { Env } from "@/config/env";
import type { AuthenticatedUser } from "./auth-types";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export function authenticate(env: Env) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const token = request.cookies[SESSION_COOKIE];

    if (!token) {
      await reply.code(401).send({
        error: "Unauthorized",
      });
      return;
    }

    let userId: string;

    try {
      userId = await verifySessionToken(token, env);
    } catch {
      await reply.code(401).send({
        error: "Unauthorized",
      });
      return;
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
      await reply.code(401).send({
        error: "Unauthorized",
      });
      return;
    }

    const authenticatedUser: AuthenticatedUser = user;

    request.currentUser = authenticatedUser;
  };
}
