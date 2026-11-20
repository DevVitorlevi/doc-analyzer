import { describe, expect, it } from "vitest";
import {
  TITLE_MAX_LENGTH,
  INSTRUCTION_MAX_LENGTH,
  UPLOAD_FORM_MESSAGES,
  getDefaultTitle,
  validateUploadForm,
} from "./upload-form";

describe("getDefaultTitle", () => {
  it("retorna o nome do arquivo quando está dentro do limite", () => {
    expect(getDefaultTitle("documento.pdf")).toBe("documento.pdf");
  });

  it("limita o título a 120 caracteres", () => {
    const fileName = "a".repeat(TITLE_MAX_LENGTH + 20);

    expect(getDefaultTitle(fileName)).toHaveLength(TITLE_MAX_LENGTH);
  });

  it("preserva um nome com exatamente 120 caracteres", () => {
    const fileName = "a".repeat(TITLE_MAX_LENGTH);

    expect(getDefaultTitle(fileName)).toBe(fileName);
  });

  it("retorna uma string vazia quando o nome está vazio", () => {
    expect(getDefaultTitle("")).toBe("");
  });
});

describe("validateUploadForm", () => {
  it("não retorna erros para um formulário válido", () => {
    expect(
      validateUploadForm({
        title: "Meu documento",
        instruction: "Analise este documento.",
      }),
    ).toEqual({});
  });

  it("exige um título", () => {
    expect(
      validateUploadForm({
        title: "",
        instruction: "Analise este documento.",
      }),
    ).toEqual({
      title: UPLOAD_FORM_MESSAGES.titleRequired,
    });
  });

  it("rejeita título contendo apenas espaços", () => {
    expect(
      validateUploadForm({
        title: "   ",
        instruction: "Analise este documento.",
      }),
    ).toEqual({
      title: UPLOAD_FORM_MESSAGES.titleRequired,
    });
  });

  it("rejeita título com mais de 120 caracteres", () => {
    expect(
      validateUploadForm({
        title: "a".repeat(TITLE_MAX_LENGTH + 1),
        instruction: "Analise este documento.",
      }),
    ).toEqual({
      title: UPLOAD_FORM_MESSAGES.titleTooLong,
    });
  });

  it("aceita título com exatamente 120 caracteres", () => {
    expect(
      validateUploadForm({
        title: "a".repeat(TITLE_MAX_LENGTH),
        instruction: "Analise este documento.",
      }),
    ).toEqual({});
  });

  it("exige uma instrução", () => {
    expect(
      validateUploadForm({
        title: "Meu documento",
        instruction: "",
      }),
    ).toEqual({
      instruction: UPLOAD_FORM_MESSAGES.instructionRequired,
    });
  });

  it("rejeita instrução contendo apenas espaços", () => {
    expect(
      validateUploadForm({
        title: "Meu documento",
        instruction: "   ",
      }),
    ).toEqual({
      instruction: UPLOAD_FORM_MESSAGES.instructionRequired,
    });
  });

  it("rejeita instrução com mais de 2000 caracteres", () => {
    expect(
      validateUploadForm({
        title: "Meu documento",
        instruction: "a".repeat(INSTRUCTION_MAX_LENGTH + 1),
      }),
    ).toEqual({
      instruction: UPLOAD_FORM_MESSAGES.instructionTooLong,
    });
  });

  it("aceita instrução com exatamente 2000 caracteres", () => {
    expect(
      validateUploadForm({
        title: "Meu documento",
        instruction: "a".repeat(INSTRUCTION_MAX_LENGTH),
      }),
    ).toEqual({});
  });

  it("retorna os erros dos dois campos simultaneamente", () => {
    expect(
      validateUploadForm({
        title: "",
        instruction: "",
      }),
    ).toEqual({
      title: UPLOAD_FORM_MESSAGES.titleRequired,
      instruction: UPLOAD_FORM_MESSAGES.instructionRequired,
    });
  });
});
