import { findAcceptedFileType } from "./file-validation";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;

const kilobyteFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const megabyteFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }

  if (sizeBytes < BYTES_PER_KB) {
    return `${Math.round(sizeBytes)} B`;
  }

  const kilobytes = Math.round(sizeBytes / BYTES_PER_KB);

  if (kilobytes < BYTES_PER_KB) {
    return `${kilobyteFormatter.format(kilobytes)} KB`;
  }

  return `${megabyteFormatter.format(sizeBytes / BYTES_PER_MB)} MB`;
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return dateFormatter.format(date);
}

export function mimeToExt(mimeType: string): string {
  return findAcceptedFileType(mimeType)?.extension ?? "";
}

export function mimeToLabel(mimeType: string): string {
  return findAcceptedFileType(mimeType)?.label ?? "";
}
