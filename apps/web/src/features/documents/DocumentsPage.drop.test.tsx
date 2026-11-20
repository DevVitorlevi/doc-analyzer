import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toast, Toaster } from "sonner";

import { MAX_FILE_SIZE_BYTES } from "@/lib/file-validation";
import { renderWithProviders, screen } from "@/test/test-utils";

import DocumentsPage from "./DocumentsPage";

const AREA_LABEL = "Área de documentos";
const MODAL_TITLE = "Prévia do Documento";
const UNSUPPORTED_MESSAGE = "Formato não suportado. Envie PDF, DOCX ou TXT.";
const TOO_LARGE_MESSAGE = "O arquivo excede o limite de 10 MB.";
const MULTIPLE_MESSAGE = "Envie um arquivo por vez.";

function renderPage() {
  return renderWithProviders(
    <>
      <Toaster theme="light" />
      <DocumentsPage />
    </>,
  );
}

function fileDrag(files: File[]) {
  return { dataTransfer: { types: ["Files"], files, dropEffect: "none" } };
}

function pdf(name = "contrato.pdf") {
  return new File(["x"], name, { type: "application/pdf" });
}

async function findArea() {
  await screen.findByRole("button", { name: "Adicionar documento" });

  return screen.getByRole("region", { name: AREA_LABEL });
}

afterEach(() => {
  toast.dismiss();
});

describe("DocumentsPage — arrastar e soltar", () => {
  it("realça a área ao arrastar um arquivo e remove o realce ao sair", async () => {
    renderPage();

    const area = await findArea();

    expect(area).toHaveAttribute("data-drag-active", "false");

    fireEvent.dragEnter(area, fileDrag([pdf()]));
    expect(area).toHaveAttribute("data-drag-active", "true");

    fireEvent.dragLeave(area, fileDrag([pdf()]));
    expect(area).toHaveAttribute("data-drag-active", "false");
  });

  it("não perde o realce ao passar por elementos filhos", async () => {
    renderPage();

    const area = await findArea();
    const child = screen.getByRole("heading", {
      name: "Você ainda não tem documentos",
    });

    fireEvent.dragEnter(area, fileDrag([pdf()]));
    fireEvent.dragEnter(child, fileDrag([pdf()]));
    fireEvent.dragLeave(child, fileDrag([pdf()]));

    expect(area).toHaveAttribute("data-drag-active", "true");

    fireEvent.dragLeave(area, fileDrag([pdf()]));

    expect(area).toHaveAttribute("data-drag-active", "false");
  });

  it("ignora arrastos que não carregam arquivos", async () => {
    renderPage();

    const area = await findArea();

    fireEvent.dragEnter(area, {
      dataTransfer: { types: ["text/plain"], files: [] },
    });

    expect(area).toHaveAttribute("data-drag-active", "false");
  });

  it("abre o modal com o título pré-preenchido ao soltar um arquivo válido", async () => {
    renderPage();

    const area = await findArea();

    fireEvent.drop(area, fileDrag([pdf()]));

    expect(
      await screen.findByRole("dialog", { name: MODAL_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("contrato.pdf");
    expect(area).toHaveAttribute("data-drag-active", "false");
  });

  it("mostra o mesmo toast e não abre o modal com tipo não suportado", async () => {
    renderPage();

    const area = await findArea();

    fireEvent.drop(
      area,
      fileDrag([new File(["x"], "foto.png", { type: "image/png" })]),
    );

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mostra o mesmo toast e não abre o modal com arquivo acima de 10 MB", async () => {
    renderPage();

    const area = await findArea();
    const file = pdf("grande.pdf");

    Object.defineProperty(file, "size", { value: MAX_FILE_SIZE_BYTES + 1 });

    fireEvent.drop(area, fileDrag([file]));

    expect(await screen.findByText(TOO_LARGE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejeita vários arquivos com 'Envie um arquivo por vez.' e não abre o modal", async () => {
    renderPage();

    const area = await findArea();

    fireEvent.drop(area, fileDrag([pdf("a.pdf"), pdf("b.pdf")]));

    expect(await screen.findByText(MULTIPLE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("impede a navegação do navegador ao soltar um arquivo fora da área", async () => {
    renderPage();

    await findArea();

    const notCancelled = fireEvent.drop(document.body, fileDrag([pdf()]));

    expect(notCancelled).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("não realça nem aceita novo arquivo com o modal aberto", async () => {
    renderPage();

    const area = await findArea();

    fireEvent.drop(area, fileDrag([pdf()]));
    await screen.findByRole("dialog", { name: MODAL_TITLE });

    fireEvent.dragEnter(area, fileDrag([pdf("outro.pdf")]));
    expect(area).toHaveAttribute("data-drag-active", "false");

    fireEvent.drop(area, fileDrag([pdf("outro.pdf")]));
    expect(screen.getByLabelText("Título")).toHaveValue("contrato.pdf");
  });
});
