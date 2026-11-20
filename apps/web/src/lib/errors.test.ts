import { describe, expect, it } from "vitest";

import {
  ERROR_MESSAGES,
  getErrorMessage,
  type ApiErrorCode,
  type ProcessingErrorCode,
} from "./errors";

const API_CODES = {
  UNAUTHORIZED: true,
  VALIDATION_ERROR: true,
  FILE_TOO_LARGE: true,
  UNSUPPORTED_FILE_TYPE: true,
  NOT_FOUND: true,
  CONFLICT: true,
  STORAGE_ERROR: true,
  INTERNAL_ERROR: true,
} satisfies Record<ApiErrorCode, true>;

const PROCESSING_CODES = {
  UNREADABLE_FILE: true,
  AI_TIMEOUT: true,
  AI_RATE_LIMIT: true,
  AI_ERROR: true,
  STORAGE_ERROR: true,
  INTERNAL_ERROR: true,
} satisfies Record<ProcessingErrorCode, true>;

const apiCodes = Object.keys(API_CODES) as ApiErrorCode[];
const processingCodes = Object.keys(PROCESSING_CODES) as ProcessingErrorCode[];

describe("getErrorMessage", () => {
  it.each(apiCodes)("devolve uma mensagem para o ApiErrorCode %s", (code) => {
    const message = getErrorMessage(code);

    expect(message.trim()).not.toBe("");
    expect(message).not.toContain("undefined");
  });

  it.each(processingCodes)(
    "devolve uma mensagem para o ProcessingErrorCode %s",
    (code) => {
      const message = getErrorMessage(code);

      expect(message.trim()).not.toBe("");
      expect(message).not.toContain("undefined");
    },
  );

  it("não mantém mensagens para códigos que não existem nas unions", () => {
    const expectedCodes = [...new Set([...apiCodes, ...processingCodes])];

    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual(expectedCodes.sort());
  });

  it("usa os textos aprovados para os erros de sessão e de arquivo", () => {
    expect(getErrorMessage("UNAUTHORIZED")).toBe(
      "Sua sessão expirou. Entre novamente.",
    );
    expect(getErrorMessage("FILE_TOO_LARGE")).toBe(
      "O arquivo excede o limite de 10 MB.",
    );
    expect(getErrorMessage("UNSUPPORTED_FILE_TYPE")).toBe(
      "Formato não suportado. Envie PDF, DOCX ou TXT.",
    );
  });
});
