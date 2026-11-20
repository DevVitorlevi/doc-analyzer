import { afterEach, describe, expect, it, vi } from "vitest";
import { toast, Toaster } from "sonner";

import { MAX_FILE_SIZE_BYTES } from "@/lib/file-validation";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/test-utils";

import DocumentsPage from "./DocumentsPage";

const UNSUPPORTED_MESSAGE = "Formato não suportado. Envie PDF, DOCX ou TXT.";
const TOO_LARGE_MESSAGE = "O arquivo excede o limite de 10 MB.";
const FILE_INPUT_LABEL = "Selecionar arquivo";
const MODAL_TITLE = "Prévia do Documento";

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

  it("mostra toast e não abre o modal com tipo não suportado", async () => {
    const user = userEvent.setup({ applyAccept: false });

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    await user.upload(
      screen.getByLabelText(FILE_INPUT_LABEL),
      new File(["x"], "foto.png", { type: "image/png" }),
    );

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra toast e não abre o modal com arquivo acima de 10 MB", async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    const file = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });

    await user.upload(screen.getByLabelText(FILE_INPUT_LABEL), file);

    expect(await screen.findByText(TOO_LARGE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

  it("abre o modal com o título pré-preenchido ao escolher um arquivo válido", async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByRole("button", { name: "Adicionar documento" });

    await user.upload(
      screen.getByLabelText(FILE_INPUT_LABEL),
      new File(["x"], "contrato.pdf", { type: "application/pdf" }),
    );

    expect(
      await screen.findByRole("dialog", { name: MODAL_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("contrato.pdf");
    expect(screen.queryByText(UNSUPPORTED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(TOO_LARGE_MESSAGE)).not.toBeInTheDocument();
  });

  it("fecha o modal com Esc, devolve o foco ao botão Adicionar documento e permite escolher o mesmo arquivo de novo", async () => {
    const user = userEvent.setup();

    renderPage();

    const addButton = await screen.findByRole("button", {
      name: "Adicionar documento",
    });
    const input = screen.getByLabelText(FILE_INPUT_LABEL);
    const file = new File(["x"], "contrato.pdf", { type: "application/pdf" });

    await user.upload(input, file);
    await screen.findByRole("dialog", { name: MODAL_TITLE });
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(addButton).toHaveFocus());

    await user.upload(input, file);

    expect(
      await screen.findByRole("dialog", { name: MODAL_TITLE }),
    ).toBeInTheDocument();
  });
});
