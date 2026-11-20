import { afterEach, describe, expect, it, vi } from "vitest";
import { toast, Toaster } from "sonner";

import { MAX_FILE_SIZE_BYTES } from "@/lib/file-validation";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

import DocumentsPage from "./DocumentsPage";

const UNSUPPORTED_MESSAGE = "Formato não suportado. Envie PDF, DOCX ou TXT.";
const TOO_LARGE_MESSAGE = "O arquivo excede o limite de 10 MB.";
const FILE_INPUT_LABEL = "Selecionar arquivo";

function renderPage() {
  return renderWithProviders(
    <>
      <Toaster theme="light" />
      <DocumentsPage />
    </>,
  );
}

afterEach(() => {
  toast.dismiss();
});

describe("DocumentsPage — seleção de arquivo", () => {
  it("abre o seletor nativo ao clicar em Adicionar documento", async () => {
    const user = userEvent.setup();

    renderPage();

    const button = await screen.findByRole("button", {
      name: "Adicionar documento",
    });
    const input = screen.getByLabelText(FILE_INPUT_LABEL);
    const onInputClick = vi.fn();

    input.addEventListener("click", onInputClick);

    await user.click(button);

    expect(onInputClick).toHaveBeenCalledTimes(1);
  });

  it("restringe o seletor a PDF, DOCX e TXT", async () => {
    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    expect(screen.getByLabelText(FILE_INPUT_LABEL)).toHaveAttribute(
      "accept",
      ".pdf,.docx,.txt",
    );
  });

  it("mostra toast e não avança com tipo não suportado", async () => {
    const user = userEvent.setup({ applyAccept: false });

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    await user.upload(
      screen.getByLabelText(FILE_INPUT_LABEL),
      new File(["x"], "foto.png", { type: "image/png" }),
    );

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeInTheDocument();
  });

  it("mostra toast e não avança com arquivo acima de 10 MB", async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    const file = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });

    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), file);

    expect(await screen.findByText(TOO_LARGE_MESSAGE)).toBeInTheDocument();
  });

  it("permite escolher o mesmo arquivo duas vezes seguidas", async () => {
    const user = userEvent.setup({ applyAccept: false });

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    const input = screen.getByLabelText(FILE_INPUT_LABEL);
    const file = new File(["x"], "foto.png", { type: "image/png" });

    await user.upload(input, file);
    await user.upload(input, file);

    expect(await screen.findAllByText(UNSUPPORTED_MESSAGE)).toHaveLength(2);
  });

  it("não exibe erro ao escolher um arquivo válido", async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    await user.upload(
      screen.getByLabelText(FILE_INPUT_LABEL),
      new File(["x"], "contrato.pdf", { type: "application/pdf" }),
    );

    expect(screen.queryByText(UNSUPPORTED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(TOO_LARGE_MESSAGE)).not.toBeInTheDocument();
  });
});
