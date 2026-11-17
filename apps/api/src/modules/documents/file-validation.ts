import { fileTypeFromBuffer } from "file-type";
import type { DocumentFormat } from "@/integrations/text-extraction/text-extractor";
import { AppError } from "@/shared/errors/app-error";

export interface DetectedFile {
  format: DocumentFormat;
  mimeType: string;
  extension: string;
}

const SUPPORTED_FORMATS: Record<DocumentFormat, DetectedFile> = {
  pdf: { format: "pdf", mimeType: "application/pdf", extension: "pdf" },
  docx: {
    format: "docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  txt: { format: "txt", mimeType: "text/plain", extension: "txt" },
};

const MAX_FILE_NAME_LENGTH = 200;
const FALLBACK_FILE_NAME = "documento";

function unsupportedFileType(): AppError {
  return new AppError(
    "UNSUPPORTED_FILE_TYPE",
    "Tipo de arquivo não suportado. Envie PDF, DOCX ou TXT (UTF-8).",
    415,
  );
}

function isValidUtf8Text(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return false;
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

export async function detectFileType(
  buffer: Buffer,
  originalName: string,
): Promise<DetectedFile> {
  const detected = await fileTypeFromBuffer(buffer);

  if (detected) {
    if (detected.ext === "pdf") {
      return SUPPORTED_FORMATS.pdf;
    }

    if (detected.ext === "docx") {
      return SUPPORTED_FORMATS.docx;
    }

    throw unsupportedFileType();
  }

  if (originalName.toLowerCase().endsWith(".txt") && isValidUtf8Text(buffer)) {
    return SUPPORTED_FORMATS.txt;
  }

  throw unsupportedFileType();
}

function isForbiddenCodePoint(codePoint: number): boolean {
  return (
    codePoint < 32 ||
    codePoint === 127 ||
    (codePoint >= 0x200b && codePoint <= 0x200f) ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
}

function limitLength(name: string): string {
  const characters = Array.from(name);

  if (characters.length <= MAX_FILE_NAME_LENGTH) {
    return name;
  }

  const dotIndex = name.lastIndexOf(".");
  const extension =
    dotIndex > 0 && name.length - dotIndex <= 10 ? name.slice(dotIndex) : "";

  return (
    characters
      .slice(0, MAX_FILE_NAME_LENGTH - Array.from(extension).length)
      .join("") + extension
  );
}

export function sanitizeFileName(name: string): string {
  const lastSegment = name.split(/[\\/]/).pop() ?? "";

  const cleaned = Array.from(lastSegment)
    .filter((char) => !isForbiddenCodePoint(char.codePointAt(0) ?? 0))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");

  if (cleaned === "") {
    return FALLBACK_FILE_NAME;
  }

  return limitLength(cleaned);
}
