export interface TruncatedText {
  text: string;
  truncated: boolean;
}

export function normalizeText(input: string): string {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/(?![\n\t])\p{Cc}/gu, "")
    .replace(/[\p{Zs}\t]+/gu, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasUsefulText(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

export function truncateText(text: string, maxChars: number): TruncatedText {
  if (!Number.isInteger(maxChars) || maxChars < 1) {
    throw new RangeError("maxChars must be a positive integer");
  }

  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  let end = maxChars;
  const lastCodeUnit = text.charCodeAt(end - 1);
  const isHighSurrogate = lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff;

  if (isHighSurrogate) {
    end -= 1;
  }

  return { text: text.slice(0, end), truncated: true };
}
