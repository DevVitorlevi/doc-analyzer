import { describe, expect, it } from "vitest";
import {
  hasUsefulText,
  normalizeText,
  truncateText,
} from "@/integrations/text-extraction/text-processing";

describe("normalizeText", () => {
  it("removes the BOM and converts line endings to LF", () => {
    expect(normalizeText("\uFEFFline 1\r\nline 2\rline 3")).toBe(
      "line 1\nline 2\nline 3",
    );
  });

  it("turns form feeds into line breaks", () => {
    expect(normalizeText("page 1\fpage 2")).toBe("page 1\npage 2");
  });

  it("removes control characters but keeps line breaks and tabs as spaces", () => {
    expect(normalizeText("a\u0000b\u0007c\td")).toBe("abc d");
  });

  it("collapses horizontal whitespace, including non-breaking spaces", () => {
    expect(normalizeText("a   b\u00A0\u00A0c")).toBe("a b c");
  });

  it("trims spaces around line breaks", () => {
    expect(normalizeText("a  \n  b")).toBe("a\nb");
  });

  it("collapses three or more line breaks into one blank line", () => {
    expect(normalizeText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims the whole text", () => {
    expect(normalizeText("  \n  hello  \n  ")).toBe("hello");
  });

  it("keeps accented characters", () => {
    expect(normalizeText("Análise jurídica")).toBe("Análise jurídica");
  });
});

describe("hasUsefulText", () => {
  it.each(["a", "7", "Análise", "ção"])("accepts %s", (text) => {
    expect(hasUsefulText(text)).toBe(true);
  });

  it.each(["", "   ", "\n\n", "---", "... !!!"])("rejects %j", (text) => {
    expect(hasUsefulText(text)).toBe(false);
  });
});

describe("truncateText", () => {
  it("does not truncate text at or below the limit", () => {
    expect(truncateText("abc", 3)).toEqual({ text: "abc", truncated: false });
    expect(truncateText("ab", 3)).toEqual({ text: "ab", truncated: false });
  });

  it("truncates text above the limit and flags it", () => {
    expect(truncateText("abcdef", 4)).toEqual({
      text: "abcd",
      truncated: true,
    });
  });

  it("does not split a surrogate pair", () => {
    const result = truncateText("ab😀cd", 3);

    expect(result.truncated).toBe(true);
    expect(result.text).toBe("ab");
  });

  it("keeps a complete surrogate pair when it fits", () => {
    expect(truncateText("ab😀cd", 4)).toEqual({
      text: "ab😀",
      truncated: true,
    });
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects the invalid limit %s", (limit) => {
    expect(() => truncateText("abc", limit)).toThrow(RangeError);
  });
});
