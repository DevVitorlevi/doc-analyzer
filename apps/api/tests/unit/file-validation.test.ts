import { describe, expect, it } from "vitest";
import {
  detectFileType,
  sanitizeFileName,
} from "@/modules/documents/file-validation";
import { makeDocx, makePdf } from "../helpers/document-fixtures";

describe("detectFileType", () => {
  it("detects a PDF by its signature, ignoring the file name", async () => {
    const result = await detectFileType(
      makePdf([["Texto do PDF"]]),
      "arquivo.bin",
    );

    expect(result).toEqual({
      format: "pdf",
      mimeType: "application/pdf",
      extension: "pdf",
    });
  });

  it("detects a DOCX by its content", async () => {
    const result = await detectFileType(
      await makeDocx(["Texto do DOCX"]),
      "arquivo.pdf",
    );

    expect(result.format).toBe("docx");
    expect(result.extension).toBe("docx");
  });

  it("accepts a UTF-8 text file with .txt extension", async () => {
    const result = await detectFileType(
      Buffer.from("Olá, mundo! Ação e emoção."),
      "Notas.TXT",
    );

    expect(result).toEqual({
      format: "txt",
      mimeType: "text/plain",
      extension: "txt",
    });
  });

  it("rejects text without the .txt extension", async () => {
    await expect(
      detectFileType(Buffer.from("texto simples"), "notas.csv"),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
      statusCode: 415,
    });
  });

  it("rejects a .txt file that is not valid UTF-8", async () => {
    const windows1252 = Buffer.from([0x63, 0x61, 0x66, 0xe9]);

    await expect(detectFileType(windows1252, "cafe.txt")).rejects.toMatchObject(
      {
        code: "UNSUPPORTED_FILE_TYPE",
      },
    );
  });

  it("rejects a .txt file containing NUL bytes", async () => {
    await expect(
      detectFileType(Buffer.from([0x61, 0x00, 0x62]), "binario.txt"),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });
  });

  it("rejects a recognized but unsupported format renamed to .txt", async () => {
    const png = Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      Buffer.alloc(64),
    ]);

    await expect(detectFileType(png, "imagem.txt")).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
    });
  });
});

describe("sanitizeFileName", () => {
  it("removes directory components", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Users\\ana\\relatorio.pdf")).toBe(
      "relatorio.pdf",
    );
  });

  it("removes control characters and bidirectional overrides", () => {
    expect(sanitizeFileName("a\u0000b.txt")).toBe("ab.txt");
    expect(sanitizeFileName("fatura\u202Egpj.exe")).toBe("faturagpj.exe");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeFileName("  meu   arquivo .txt ")).toBe("meu arquivo .txt");
  });

  it("falls back to a default name when nothing is left", () => {
    expect(sanitizeFileName("")).toBe("documento");
    expect(sanitizeFileName("...")).toBe("documento");
    expect(sanitizeFileName("pasta/")).toBe("documento");
  });

  it("limits the length while preserving the extension", () => {
    const result = sanitizeFileName(`${"a".repeat(300)}.pdf`);

    expect(result).toHaveLength(200);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});
