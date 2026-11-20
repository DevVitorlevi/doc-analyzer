export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STORAGE_ERROR"
  | "INTERNAL_ERROR";

export type ProcessingErrorCode =
  | "UNREADABLE_FILE"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMIT"
  | "AI_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL_ERROR";

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Sua sessão expirou. Entre novamente.",
  VALIDATION_ERROR: "Verifique os campos informados.",
  FILE_TOO_LARGE: "O arquivo excede o limite de 10 MB.",
  UNSUPPORTED_FILE_TYPE: "Formato não suportado. Envie PDF, DOCX ou TXT.",
  NOT_FOUND: "Documento não encontrado.",
  CONFLICT: "Este documento não pode ser reprocessado agora.",
  STORAGE_ERROR:
    "Falha ao acessar o armazenamento do arquivo. Tente novamente.",
  INTERNAL_ERROR: "Algo deu errado. Tente novamente.",
  UNREADABLE_FILE: "Não foi possível ler o texto deste arquivo.",
  AI_TIMEOUT: "A análise demorou mais que o esperado.",
  AI_RATE_LIMIT: "Limite de uso da IA atingido. Tente novamente em instantes.",
  AI_ERROR: "A IA não conseguiu concluir a análise.",
} satisfies Record<ApiErrorCode | ProcessingErrorCode, string>;

export const MULTIPLE_FILES_MESSAGE = "Envie um arquivo por vez.";

export function getErrorMessage(
  code: ApiErrorCode | ProcessingErrorCode,
): string {
  return ERROR_MESSAGES[code];
}
