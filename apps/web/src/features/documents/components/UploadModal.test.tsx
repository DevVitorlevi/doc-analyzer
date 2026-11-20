import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { render, screen, userEvent, waitFor } from "@/test/test-utils";

import UploadModal from "./UploadModal";

const OPEN_LABEL = "Abrir modal";

function makeFile(name: string, size = 34816, type = "application/pdf"): File {
  const file = new File(["x"], name, { type });

  Object.defineProperty(file, "size", { value: size });

  return file;
}

function Harness({ file }: { file: File }) {
  const [chosen, setChosen] = useState<File | null>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={openButtonRef} type="button" onClick={() => setChosen(file)}>
        {OPEN_LABEL}
      </button>
      <UploadModal
        file={chosen}
        onClose={() => setChosen(null)}
        returnFocusRef={openButtonRef}
      />
    </>
  );
}

function TwoFilesHarness() {
  const [chosen, setChosen] = useState<File | null>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setChosen(makeFile("primeiro.pdf"))}
      >
        Abrir primeiro
      </button>
      <button type="button" onClick={() => setChosen(makeFile("segundo.pdf"))}>
        Abrir segundo
      </button>
      <UploadModal
        file={chosen}
        onClose={() => setChosen(null)}
        returnFocusRef={openButtonRef}
      />
    </>
  );
}

async function openModal(file: File) {
  const user = userEvent.setup();

  render(<Harness file={file} />);
  await user.click(screen.getByRole("button", { name: OPEN_LABEL }));
  await screen.findByRole("dialog", { name: "Prévia do Documento" });

  return user;
}

describe("UploadModal", () => {
  it("não renderiza o modal sem arquivo escolhido", () => {
    render(<Harness file={makeFile("contrato.pdf")} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre com prévia, título pré-preenchido e instrução vazia com placeholder", async () => {
    await openModal(makeFile("contrato.pdf"));

    expect(screen.getByText("34 KB · .pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("contrato.pdf");

    const instruction = screen.getByLabelText("Instrução para IA");

    expect(instruction).toHaveValue("");
    expect(instruction).toHaveAttribute(
      "placeholder",
      "Como a IA deve analisar este documento",
    );
  });

  it("trunca o título pré-preenchido em 120 caracteres", async () => {
    await openModal(makeFile(`${"a".repeat(130)}.pdf`));

    expect(screen.getByLabelText("Título")).toHaveValue("a".repeat(120));
  });

  it("instrução vazia mostra erro sob o campo e leva o foco a ele", async () => {
    const user = await openModal(makeFile("contrato.pdf"));

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    const instruction = screen.getByLabelText("Instrução para IA");

    expect(instruction).toHaveAttribute("aria-invalid", "true");
    expect(instruction).toHaveAccessibleDescription("Informe uma instrução.");
    expect(instruction).toHaveFocus();
    expect(screen.getByLabelText("Título")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("título vazio mostra erro e o foco vai ao primeiro campo inválido", async () => {
    const user = await openModal(makeFile("contrato.pdf"));

    await user.clear(screen.getByLabelText("Título"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    const title = screen.getByLabelText("Título");

    expect(title).toHaveAccessibleDescription("Informe um título.");
    expect(title).toHaveFocus();
  });

  it("título acima de 120 e instrução acima de 2000 mostram os limites", async () => {
    const user = await openModal(makeFile("contrato.pdf"));

    const title = screen.getByLabelText("Título");
    const instruction = screen.getByLabelText("Instrução para IA");

    await user.clear(title);
    await user.click(title);
    await user.paste("a".repeat(121));
    await user.click(instruction);
    await user.paste("b".repeat(2001));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(title).toHaveAccessibleDescription("Máximo de 120 caracteres.");
    expect(instruction).toHaveAccessibleDescription(
      "Máximo de 2000 caracteres.",
    );
  });

  it("com dados válidos não mostra erro e mantém o modal aberto", async () => {
    const user = await openModal(makeFile("contrato.pdf"));

    await user.type(
      screen.getByLabelText("Instrução para IA"),
      "Resuma o contrato",
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.getByLabelText("Instrução para IA")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("fecha com Esc e devolve o foco ao botão de origem", async () => {
    const user = await openModal(makeFile("contrato.pdf"));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: OPEN_LABEL })).toHaveFocus(),
    );
  });

  it("fecha pelo botão Fechar e reabre com o formulário limpo", async () => {
    const user = await openModal(makeFile("contrato.pdf"));

    await user.type(screen.getByLabelText("Instrução para IA"), "Resuma");
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: OPEN_LABEL }));

    expect(await screen.findByLabelText("Instrução para IA")).toHaveValue("");
  });
});

describe("UploadModal com arquivos diferentes", () => {
  it("ao reabrir com outro arquivo mostra o título do novo arquivo", async () => {
    const user = userEvent.setup();

    render(<TwoFilesHarness />);

    await user.click(screen.getByRole("button", { name: "Abrir primeiro" }));
    expect(await screen.findByLabelText("Título")).toHaveValue("primeiro.pdf");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir segundo" }));
    expect(await screen.findByLabelText("Título")).toHaveValue("segundo.pdf");
  });
});
