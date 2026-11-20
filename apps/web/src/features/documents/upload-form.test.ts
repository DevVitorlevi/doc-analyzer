import { describe, expect, it } from "vitest";

import {
  INSTRUCTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  getDefaultTitle,
  validateUploadForm,
} from "./upload-form";

describe("getDefaultTitle", () => {
  it("usa o nome do arquivo e trunca em 120 caracteres", () => {
    expect(getDefaultTitle("contrato.pdf")).toBe("contrato.pdf");
    expect(getDefaultTitle("a".repeat(TITLE_MAX_LENGTH + 10))).toHaveLength(
      TITLE_MAX_LENGTH,
    );
  });
});

describe("validateUploadForm", () => {
  it("aceita título e instrução válidos, inclusive nos limites", () => {
    expect(
      validateUploadForm({ title: "Contrato", instruction: "Resuma" }),
    ).toEqual({});
    expect(
      validateUploadForm({
        title: "a".repeat(TITLE_MAX_LENGTH),
        instruction: "a".repeat(INSTRUCTION_MAX_LENGTH),
      }),
    ).toEqual({});
  });

  it("rejeita título vazio, só com espaços ou acima de 120", () => {
    expect(validateUploadForm({ title: "", instruction: "x" }).title).toBe(
      "Informe um título.",
    );
    expect(validateUploadForm({ title: "   ", instruction: "x" }).title).toBe(
      "Informe um título.",
    );
    expect(
      validateUploadForm({
        title: "a".repeat(TITLE_MAX_LENGTH + 1),
        instruction: "x",
      }).title,
    ).toBe("Máximo de 120 caracteres.");
  });

  it("rejeita instrução vazia ou acima de 2000", () => {
    expect(
      validateUploadForm({ title: "x", instruction: "" }).instruction,
    ).toBe("Informe uma instrução.");
    expect(
      validateUploadForm({
        title: "x",
        instruction: "a".repeat(INSTRUCTION_MAX_LENGTH + 1),
      }).instruction,
    ).toBe("Máximo de 2000 caracteres.");
  });
});
