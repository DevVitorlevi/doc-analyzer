import type { FastifyError, FastifyInstance } from "fastify";

import { AppError } from "./app-error";

const ERROR_MESSAGES = {
  validation: "Requisição inválida.",
  fileTooLarge: "O arquivo excede o tamanho máximo permitido.",
  notFound: "Rota não encontrada.",
  internal: "Erro interno do servidor.",
} as const;

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error(
          {
            errorCode: error.code,
            statusCode: error.statusCode,
          },
          "Application error",
        );
      }

      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.code(413).send({
        error: {
          code: "FILE_TOO_LARGE",
          message: ERROR_MESSAGES.fileTooLarge,
        },
      });
    }

    if (
      error.code === "FST_FILES_LIMIT" ||
      error.code === "FST_ERR_VALIDATION" ||
      error.code === "FST_ERR_CTP_INVALID_JSON_BODY"
    ) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: ERROR_MESSAGES.validation,
        },
      });
    }

    request.log.error(
      {
        errorName: error.name,
        errorCode: error.code,
        statusCode: error.statusCode,
      },
      "Unhandled error",
    );

    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: ERROR_MESSAGES.internal,
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: {
        code: "NOT_FOUND",
        message: ERROR_MESSAGES.notFound,
      },
    });
  });
}
