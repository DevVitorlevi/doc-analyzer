import type { ApiErrorCode } from "./errors";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3333"
).replace(/\/+$/, "");

const GENERIC_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";

const API_ERROR_CODES: ReadonlySet<string> = new Set([
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_FILE_TYPE",
  "NOT_FOUND",
  "CONFLICT",
  "STORAGE_ERROR",
  "INTERNAL_ERROR",
]);

interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  const { code, message } = value.error;

  return (
    typeof code === "string" &&
    API_ERROR_CODES.has(code) &&
    typeof message === "string"
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "INTERNAL_ERROR", GENERIC_ERROR_MESSAGE);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (isApiErrorResponse(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message);
    }

    throw new ApiError(
      response.status,
      "INTERNAL_ERROR",
      GENERIC_ERROR_MESSAGE,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      response.status,
      "INTERNAL_ERROR",
      GENERIC_ERROR_MESSAGE,
    );
  }
}
