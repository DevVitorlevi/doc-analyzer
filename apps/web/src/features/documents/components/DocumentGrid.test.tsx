import { describe, expect, it } from "vitest";

import { render, screen, within } from "@/test/test-utils";

import type { DocumentListItem } from "../types";

import DocumentGrid from "./DocumentGrid";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function makeItem(overrides: Partial<DocumentListItem>): DocumentListItem {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Documento",
    createdAt: "2025-05-26T12:00:00.000Z",
    sizeBytes: 34816,
    mimeType: "application/pdf",
    status: "COMPLETED",
    ...overrides,
  };
}

describe("DocumentGrid", () => {
  it("exibe título, data e tamanho · extensão para PDF, DOCX e TXT", () => {
    render(
      <DocumentGrid
        documents={[
          makeItem({ id: "1", title: "Contrato" }),
          makeItem({
            id: "2",
            title: "Parecer",
            mimeType: DOCX_MIME,
            sizeBytes: 2_936_012,
          }),
          makeItem({
            id: "3",
            title: "Notas",
            mimeType: "text/plain",
            sizeBytes: 1024,
          }),
        ]}
      />,
    );

    const [pdf, docx, txt] = screen.getAllByRole("listitem");

    expect(pdf).toHaveTextContent("Contrato");
    expect(pdf).toHaveTextContent("26/05/2025");
    expect(pdf).toHaveTextContent("34 KB · .pdf");
    expect(within(pdf!).getByText("PDF")).toBeInTheDocument();

    expect(docx).toHaveTextContent("2,8 MB · .docx");
    expect(within(docx!).getByText("DOCX")).toBeInTheDocument();

    expect(txt).toHaveTextContent("1 KB · .txt");
    expect(within(txt!).getByText("TXT")).toBeInTheDocument();
  });

  it("mantém a ordem devolvida pela API", () => {
    render(
      <DocumentGrid
        documents={[
          makeItem({ id: "1", title: "Primeiro" }),
          makeItem({ id: "2", title: "Segundo" }),
          makeItem({ id: "3", title: "Terceiro" }),
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("Primeiro");
    expect(items[1]).toHaveTextContent("Segundo");
    expect(items[2]).toHaveTextContent("Terceiro");
  });

  it("exibe selo apenas para PROCESSING e FAILED", () => {
    render(
      <DocumentGrid
        documents={[
          makeItem({ id: "1", title: "Pronto", status: "COMPLETED" }),
          makeItem({ id: "2", title: "Em andamento", status: "PROCESSING" }),
          makeItem({ id: "3", title: "Com erro", status: "FAILED" }),
        ]}
      />,
    );

    const [completed, processing, failed] = screen.getAllByRole("listitem");

    expect(
      within(completed!).queryByText("Processando"),
    ).not.toBeInTheDocument();
    expect(within(completed!).queryByText("Falhou")).not.toBeInTheDocument();
    expect(within(processing!).getByText("Processando")).toBeInTheDocument();
    expect(within(failed!).getByText("Falhou")).toBeInTheDocument();
  });

  it("expõe o título completo para títulos longos e não quebra com tipo desconhecido", () => {
    const longTitle = "Contrato de prestação de serviços ".repeat(6).trim();

    render(
      <DocumentGrid
        documents={[
          makeItem({ id: "1", title: longTitle }),
          makeItem({ id: "2", title: "Imagem", mimeType: "image/png" }),
        ]}
      />,
    );

    expect(screen.getByText(longTitle)).toHaveAttribute("title", longTitle);

    const [, unknown] = screen.getAllByRole("listitem");

    expect(unknown).toHaveTextContent("34 KB");
    expect(unknown).not.toHaveTextContent("·");
  });
});
