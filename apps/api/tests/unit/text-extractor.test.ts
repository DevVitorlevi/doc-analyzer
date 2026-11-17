import { describe, expect, it } from "vitest";
import { extractText } from "@/integrations/text-extraction/text-extractor";
import { UnreadableFileError } from "@/integrations/text-extraction/unreadable-file-error";
import { makeDocx, makePdf } from "../helpers/document-fixtures";

const MAX_CHARS = 60000;

describe("extractText", () => {
  describe("txt", () => {
    it("reads UTF-8 text and removes the BOM", async () => {
      const buffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from("Cláusula primeira\r\nCláusula segunda", "utf-8"),
      ]);

      const result = await extractText(buffer, "txt", MAX_CHARS);

      expect(result).toEqual({
        text: "Cláusula primeira\nCláusula segunda",
        truncated: false,
      });
    });

    it.each([Buffer.alloc(0), Buffer.from("  \n\t \n")])(
      "rejects content without useful text",
      async (buffer) => {
        await expect(
          extractText(buffer, "txt", MAX_CHARS),
        ).rejects.toBeInstanceOf(UnreadableFileError);
      },
    );
  });

  describe("docx", () => {
    it("extracts the paragraphs", async () => {
      const buffer = await makeDocx(["Olá mundo", "Segundo & parágrafo"]);

      const result = await extractText(buffer, "docx", MAX_CHARS);

      expect(result.truncated).toBe(false);
      expect(result.text).toBe("Olá mundo\n\nSegundo & parágrafo");
    });

    it("rejects a document without text", async () => {
      const buffer = await makeDocx(["   ", ""]);

      await expect(
        extractText(buffer, "docx", MAX_CHARS),
      ).rejects.toBeInstanceOf(UnreadableFileError);
    });

    it("rejects a corrupted file and keeps the original cause", async () => {
      const promise = extractText(Buffer.from("not a zip"), "docx", MAX_CHARS);

      await expect(promise).rejects.toBeInstanceOf(UnreadableFileError);
      await expect(promise).rejects.toMatchObject({
        cause: expect.any(Error),
      });
    });
  });

  describe("pdf", () => {
    it("extracts text from every page without page markers", async () => {
      const buffer = makePdf([
        ["Análise jurídica do contrato", "Segunda linha (com parênteses)"],
        ["Página dois"],
      ]);

      const result = await extractText(buffer, "pdf", MAX_CHARS);

      expect(result.truncated).toBe(false);
      expect(result.text).toBe(
        "Análise jurídica do contrato\nSegunda linha (com parênteses)\n\nPágina dois",
      );
      expect(result.text).not.toMatch(/-- \d+ of \d+ --/);
    });

    it("rejects a PDF without a text layer, like a scanned document", async () => {
      const buffer = makePdf([[], []]);

      await expect(
        extractText(buffer, "pdf", MAX_CHARS),
      ).rejects.toBeInstanceOf(UnreadableFileError);
    });

    it.each([Buffer.from("not a pdf at all"), Buffer.alloc(0)])(
      "rejects a corrupted or empty file",
      async (buffer) => {
        await expect(
          extractText(buffer, "pdf", MAX_CHARS),
        ).rejects.toBeInstanceOf(UnreadableFileError);
      },
    );
  });

  describe("truncation", () => {
    it("truncates the normalized text and flags it", async () => {
      const buffer = Buffer.from("a".repeat(50), "utf-8");

      const result = await extractText(buffer, "txt", 20);

      expect(result.text).toBe("a".repeat(20));
      expect(result.truncated).toBe(true);
    });

    it("does not flag text that fits exactly", async () => {
      const buffer = Buffer.from("a".repeat(20), "utf-8");

      const result = await extractText(buffer, "txt", 20);

      expect(result.truncated).toBe(false);
    });

    it("truncates PDF and DOCX text too", async () => {
      const longLine = "palavra ".repeat(20).trim();

      const pdf = await extractText(makePdf([[longLine]]), "pdf", 30);
      const docx = await extractText(await makeDocx([longLine]), "docx", 30);

      expect(pdf).toEqual({ text: longLine.slice(0, 30), truncated: true });
      expect(docx).toEqual({ text: longLine.slice(0, 30), truncated: true });
    });
  });
});
