export type AppErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "NOT_FOUND"
  | "UNREADABLE_FILE"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMIT"
  | "AI_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;

  constructor(
    code: AppErrorCode,
    message: string,
    statusCode: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
