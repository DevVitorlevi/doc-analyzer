import type { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "@/shared/errors/app-error";

import {
  createDocumentFieldsSchema,
  documentIdParamsSchema,
  toDocumentDetailResponse,
  toDocumentListItemResponse,
  toDocumentResponse,
} from "./documents-schemas";
import type { DocumentService } from "./documents-service";

interface UploadForm {
  title?: string;
  instruction?: string;
  file?: {
    originalName: string;
    buffer: Buffer;
  };
}

async function readUploadForm(request: FastifyRequest): Promise<UploadForm> {
  if (!request.isMultipart()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Envie os dados como multipart/form-data.",
      400,
    );
  }

  const form: UploadForm = {};

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "file" || form.file) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Envie exatamente um arquivo no campo 'file'.",
          400,
        );
      }

      const buffer = await part.toBuffer();

      if (part.file.truncated) {
        throw new AppError(
          "FILE_TOO_LARGE",
          "O arquivo excede o tamanho máximo permitido.",
          413,
        );
      }

      form.file = { originalName: part.filename, buffer };
      continue;
    }

    if (typeof part.value !== "string") {
      continue;
    }

    if (part.fieldnameTruncated || part.valueTruncated) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Um dos campos é grande demais.",
        400,
      );
    }

    if (part.fieldname === "title") {
      form.title = part.value;
    } else if (part.fieldname === "instruction") {
      form.instruction = part.value;
    }
  }

  return form;
}

export function createDocumentHandler(service: DocumentService) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const user = request.currentUser;

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", 401);
    }

    const form = await readUploadForm(request);

    const fields = createDocumentFieldsSchema.safeParse({
      title: form.title,
      instruction: form.instruction,
    });

    if (!fields.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        fields.error.issues[0]?.message ?? "Dados inválidos.",
        400,
      );
    }

    if (!form.file) {
      throw new AppError("VALIDATION_ERROR", "O arquivo é obrigatório.", 400);
    }

    const document = await service.createDocument({
      userId: user.id,
      title: fields.data.title,
      instruction: fields.data.instruction,
      file: form.file,
    });

    return reply.code(201).send(toDocumentResponse(document));
  };
}

export function createListDocumentsHandler(service: DocumentService) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const user = request.currentUser;

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", 401);
    }

    const documents = await service.listDocuments(user.id);

    return reply.code(200).send(documents.map(toDocumentListItemResponse));
  };
}

export function createGetDocumentHandler(service: DocumentService) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const user = request.currentUser;

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", 401);
    }

    const params = documentIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        params.error.issues[0]?.message ?? "Parâmetros inválidos.",
        400,
      );
    }

    const result = await service.getDocumentById(params.data.id, user.id);

    return reply
      .code(200)
      .send(toDocumentDetailResponse(result.document, result.fileUrl));
  };
}

export function createDeleteDocumentHandler(service: DocumentService) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const user = request.currentUser;

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Sessão inválida ou expirada.", 401);
    }

    const params = documentIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        params.error.issues[0]?.message ?? "Parâmetros inválidos.",
        400,
      );
    }

    await service.deleteDocument(params.data.id, user.id);

    return reply.code(204).send();
  };
}
