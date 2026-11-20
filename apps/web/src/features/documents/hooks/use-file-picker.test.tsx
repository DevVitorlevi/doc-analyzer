import { afterEach, describe, expect, it } from "vitest";
import { toast, Toaster } from "sonner";

import { MAX_FILE_SIZE_BYTES } from "@/features/documents/utils/file-validation";
import { render, screen, userEvent } from "@/test/test-utils";

import { useFilePicker } from "./use-file-picker";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const UNSUPPORTED_MESSAGE = "Formato não suportado. Envie PDF, DOCX ou TXT.";
const TOO_LARGE_MESSAGE = "O arquivo excede o limite de 10 MB.";
const NO_FILE = "nenhum";

function Harness() {
  const { inputRef, openPicker, handleInputChange, chosenFile } =
    useFilePicker();

  return (
    <>
      <Toaster theme="light" />
      <button type="button" onClick={openPicker}>
        Abrir seletor
      </button>
      <input
        ref={inputRef}
        type="file"
        aria-label="Arquivo"
        onChange={handleInputChange}
      />
      <output>{chosenFile?.name ?? NO_FILE}</output>
    </>
  );
}

function makeFile(name: string, type: string, size?: number): File {
  const file = new File(["conteúdo"], name, { type });

  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }

  return file;
}

afterEach(() => {
  toast.dismiss();
});

describe("useFilePicker", () => {
  it("guarda o arquivo válido (PDF, DOCX e TXT) sem exibir erro", async () => {
    const user = userEvent.setup();

    render(<Harness />);

    const input = screen.getByLabelText("Arquivo");

    await user.upload(input, makeFile("contrato.pdf", "application/pdf"));
    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();

    await user.upload(input, makeFile("parecer.docx", DOCX_MIME));
    expect(screen.getByText("parecer.docx")).toBeInTheDocument();

    await user.upload(input, makeFile("notas.txt", "text/plain"));
    expect(screen.getByText("notas.txt")).toBeInTheDocument();

    expect(screen.queryByText(UNSUPPORTED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(TOO_LARGE_MESSAGE)).not.toBeInTheDocument();
  });

  it("aceita arquivo de exatamente 10 MB e rejeita 10 MB + 1 B", async () => {
    const user = userEvent.setup();

    render(<Harness />);

    const input = screen.getByLabelText("Arquivo");

    await user.upload(
      input,
      makeFile("limite.pdf", "application/pdf", MAX_FILE_SIZE_BYTES),
    );
    expect(screen.getByText("limite.pdf")).toBeInTheDocument();

    await user.upload(
      input,
      makeFile("grande.pdf", "application/pdf", MAX_FILE_SIZE_BYTES + 1),
    );

    expect(await screen.findByText(TOO_LARGE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText("grande.pdf")).not.toBeInTheDocument();
  });

  it("rejeita tipo não suportado com toast e não guarda o arquivo", async () => {
    const user = userEvent.setup({ applyAccept: false });

    render(<Harness />);

    await user.upload(
      screen.getByLabelText("Arquivo"),
      makeFile("foto.png", "image/png"),
    );

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(NO_FILE)).toBeInTheDocument();
  });

  it("usa a extensão quando o navegador não informa o tipo do arquivo", async () => {
    const user = userEvent.setup();

    render(<Harness />);

    await user.upload(
      screen.getByLabelText("Arquivo"),
      makeFile("notas.txt", ""),
    );

    expect(screen.getByText("notas.txt")).toBeInTheDocument();
    expect(screen.queryByText(UNSUPPORTED_MESSAGE)).not.toBeInTheDocument();
  });
});
