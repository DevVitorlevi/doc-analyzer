import { describe, expect, it } from "vitest";

import { formatDate, formatSize, mimeToExt, mimeToLabel } from "./format";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("formatSize", () => {
  it("formata bytes, KB e MB no padrão pt-BR", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(34816)).toBe("34 KB");
    expect(formatSize(2936012)).toBe("2,8 MB");
    expect(formatSize(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("não exibe KB acima de 1023 no limite com MB", () => {
    expect(formatSize(1048575)).toBe("1 MB");
  });

  it("trata valores inválidos como 0 B", () => {
    expect(formatSize(-5)).toBe("0 B");
    expect(formatSize(Number.NaN)).toBe("0 B");
  });
});

describe("formatDate", () => {
  it("formata a data ISO como dd/MM/aaaa", () => {
    expect(formatDate("2025-05-26T12:00:00.000Z")).toBe("26/05/2025");
  });

  it("devolve texto vazio para data inválida", () => {
    expect(formatDate("não é data")).toBe("");
  });
});

describe("mimeToExt e mimeToLabel", () => {
  it("converte os tipos aceitos", () => {
    expect(mimeToLabel("application/pdf")).toBe("PDF");
    expect(mimeToExt("application/pdf")).toBe(".pdf");
    expect(mimeToLabel(DOCX_MIME)).toBe("DOCX");
    expect(mimeToExt(DOCX_MIME)).toBe(".docx");
    expect(mimeToLabel("text/plain")).toBe("TXT");
    expect(mimeToExt("text/plain;charset=utf-8")).toBe(".txt");
  });

  it("não quebra com tipo desconhecido", () => {
    expect(mimeToLabel("image/png")).toBe("");
    expect(mimeToExt("image/png")).toBe("");
    expect(mimeToExt("")).toBe("");
  });
});
