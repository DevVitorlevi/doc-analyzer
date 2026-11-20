import type { ApiErrorCode } from "./errors";

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export interface AcceptedFileType {
  label: string;
  extension: string;
}

const ACCEPTED_FILE_TYPES: ReadonlyMap<string, AcceptedFileType> = new Map([
  ["application/pdf", { label: "PDF", extension: ".pdf" }],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    { label: "DOCX", extension: ".docx" },
  ],
  ["text/plain", { label: "TXT", extension: ".txt" }],
]);

export type FileValidationError = Extract<
  ApiErrorCode,
  "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE"
>;

interface FileLike {
  name: string;
  size: number;
  type: string;
}

function normalizeMimeType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? "").trim().toLowerCase();
}

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

export function findAcceptedFileType(
  mimeType: string,
): AcceptedFileType | null {
  return ACCEPTED_FILE_TYPES.get(normalizeMimeType(mimeType)) ?? null;
}

function findAcceptedFileTypeByExtension(
  fileName: string,
): AcceptedFileType | null {
  const extension = getExtension(fileName);

  for (const fileType of ACCEPTED_FILE_TYPES.values()) {
    if (fileType.extension === extension) {
      return fileType;
    }
  }

  return null;
}

export function validateFile(file: FileLike): FileValidationError | null {
  const hasMimeType = normalizeMimeType(file.type) !== "";

  const acceptedType = hasMimeType
    ? findAcceptedFileType(file.type)
    : findAcceptedFileTypeByExtension(file.name);

  if (acceptedType === null) {
    return "UNSUPPORTED_FILE_TYPE";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "FILE_TOO_LARGE";
  }

  return null;
}
