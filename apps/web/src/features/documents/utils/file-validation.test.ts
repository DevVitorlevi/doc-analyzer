import { describe, expect, it } from "vitest";

import { MAX_FILE_SIZE_BYTES, validateFile } from "./file-validation";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function fileLike(name: string, type: string, size = 1024) {
  return { name, type, size };
}

describe("validateFile", () => {
  it("aceita PDF, DOCX e TXT", () => {
    expect(validateFile(fileLike("a.pdf", "application/pdf"))).toBeNull();
    expect(validateFile(fileLike("a.docx", DOCX_MIME))).toBeNull();
    expect(validateFile(fileLike("a.txt", "text/plain"))).toBeNull();
    expect(
      validateFile(fileLike("a.txt", "text/plain;charset=utf-8")),
    ).toBeNull();
  });

  it("rejeita PNG, DOC e XLSX", () => {
    expect(validateFile(fileLike("a.png", "image/png"))).toBe(
      "UNSUPPORTED_FILE_TYPE",
    );
    expect(validateFile(fileLike("a.doc", "application/msword"))).toBe(
      "UNSUPPORTED_FILE_TYPE",
    );
    expect(validateFile(fileLike("a.xlsx", XLSX_MIME))).toBe(
      "UNSUPPORTED_FILE_TYPE",
    );
  });

  it("usa a extensão apenas quando o navegador não informa o tipo", () => {
    expect(validateFile(fileLike("a.docx", ""))).toBeNull();
    expect(validateFile(fileLike("a.png", ""))).toBe("UNSUPPORTED_FILE_TYPE");
    expect(validateFile(fileLike("semextensao", ""))).toBe(
      "UNSUPPORTED_FILE_TYPE",
    );
  });

  it("aceita 10 MB e rejeita 10 MB + 1 byte", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);

    expect(
      validateFile(fileLike("a.pdf", "application/pdf", MAX_FILE_SIZE_BYTES)),
    ).toBeNull();

    expect(
      validateFile(
        fileLike("a.pdf", "application/pdf", MAX_FILE_SIZE_BYTES + 1),
      ),
    ).toBe("FILE_TOO_LARGE");
  });

  it("prioriza o erro de tipo sobre o de tamanho", () => {
    expect(
      validateFile(fileLike("a.png", "image/png", MAX_FILE_SIZE_BYTES + 1)),
    ).toBe("UNSUPPORTED_FILE_TYPE");
  });
});
