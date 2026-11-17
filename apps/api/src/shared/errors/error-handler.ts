import type { FastifyError, FastifyInstance } from "fastify";
import { AppError } from "./app-error";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error }, "Application error");
      }

      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.code(413).send({
        error: {
          code: "FILE_TOO_LARGE",
          message: "O arquivo excede o tamanho máximo permitido.",
        },
      });
    }

    if (
      error.statusCode !== undefined &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return reply.code(error.statusCode).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Requisição inválida.",
        },
      });
    }

    request.log.error({ err: error }, "Unhandled error");

    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor.",
      },
    });
  });
}
