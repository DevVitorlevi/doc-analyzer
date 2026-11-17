import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import {
  hasUsefulText,
  normalizeText,
  truncateText,
  type TruncatedText,
} from "./text-processing";
import { UnreadableFileError } from "./unreadable-file-error";

export type DocumentFormat = "pdf" | "docx" | "txt";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText({ pageJoiner: "\n\n" });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractPlainText(buffer: Buffer): string {
  return new TextDecoder("utf-8").decode(buffer);
}

async function extractRawText(
  buffer: Buffer,
  format: DocumentFormat,
): Promise<string> {
  switch (format) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "txt":
      return extractPlainText(buffer);
  }
}

export async function extractText(
  buffer: Buffer,
  format: DocumentFormat,
  maxChars: number,
): Promise<TruncatedText> {
  let rawText: string;

  try {
    rawText = await extractRawText(buffer, format);
  } catch (error) {
    throw new UnreadableFileError(error);
  }

  const text = normalizeText(rawText);

  if (!hasUsefulText(text)) {
    throw new UnreadableFileError();
  }

  return truncateText(text, maxChars);
}
