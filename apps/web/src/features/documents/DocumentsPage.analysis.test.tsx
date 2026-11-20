import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders, screen, userEvent } from "@/test/test-utils";
import { server } from "@/test/server";

import DocumentsPage from "./DocumentsPage";

const API_URL = "http://localhost:3333";
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000010";
const MODAL_TITLE = "Análise da IA";

const listItem = {
  id: DOCUMENT_ID,
  title: "Contrato de locação",
  createdAt: "2026-11-19T12:00:00.000Z",
  sizeBytes: 34816,
  mimeType: "application/pdf",
  status: "COMPLETED",
};

const detail = {
  ...listItem,
  instruction: "INSTRUCAO-SECRETA",
  analysis: "Linha 1\nLinha 2",
  truncated: false,
  errorCode: null,
  errorMessage: null,
  originalName: "contrato.pdf",
  fileUrl: "https://example.com/contrato.pdf",
};

function useList(onCall?: () => void) {
  server.use(
    http.get(`${API_URL}/documents`, () => {
      onCall?.();
      return HttpResponse.json([listItem]);
    }),
  );
}

async function openAnalysis(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("checkbox", { name: /Contrato/ }));
  await user.click(
    screen.getByRole("button", { name: "1 documento selecionado" }),
  );
  await user.click(
    await screen.findByRole("menuitem", { name: "Visualizar análise" }),
  );
}

describe("DocumentsPage — modal de análise", () => {
  it("abre em loading e mostra título e análise sem a instrução", async () => {
    const user = userEvent.setup();

    useList();
    server.use(
      http.get(`${API_URL}/documents/${DOCUMENT_ID}`, () =>
        HttpResponse.json(detail),
      ),
    );
    renderWithProviders(<DocumentsPage />);

    await openAnalysis(user);

    expect(
      await screen.findByRole("dialog", { name: MODAL_TITLE }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Título")).toHaveValue(
      "Contrato de locação",
    );

    const analysis = screen.getByRole("region", { name: "Análise da IA" });

    expect(analysis).toHaveTextContent("Linha 1");
    expect(analysis).toHaveTextContent("Linha 2");
    expect(screen.queryByText(/INSTRUCAO-SECRETA/)).not.toBeInTheDocument();
  });

  it("renderiza HTML da análise como texto", async () => {
    const user = userEvent.setup();

    useList();
    server.use(
      http.get(`${API_URL}/documents/${DOCUMENT_ID}`, () =>
        HttpResponse.json({
          ...detail,
          analysis: "<script>x</script><b>a</b>",
        }),
      ),
    );
    renderWithProviders(<DocumentsPage />);

    await openAnalysis(user);

    const analysis = await screen.findByRole("region", {
      name: "Análise da IA",
    });

    expect(analysis).toHaveTextContent("<script>x</script><b>a</b>");
    expect(analysis.querySelector("script, b")).toBeNull();
  });

  it("mostra mensagem no modal e recarrega a lista em 404", async () => {
    const user = userEvent.setup();
    let listCalls = 0;

    useList(() => {
      listCalls += 1;
    });
    server.use(
      http.get(`${API_URL}/documents/${DOCUMENT_ID}`, () =>
        HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "bruta do servidor" } },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<DocumentsPage />);

    await openAnalysis(user);

    expect(
      await screen.findByText("Documento não encontrado."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/bruta do servidor/)).not.toBeInTheDocument();
    await vi_waitFor(() => expect(listCalls).toBeGreaterThanOrEqual(2));
  });

  it("mostra mensagem mapeada em 500", async () => {
    const user = userEvent.setup();

    useList();
    server.use(
      http.get(`${API_URL}/documents/${DOCUMENT_ID}`, () =>
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "stack" } },
          { status: 500 },
        ),
      ),
    );
    renderWithProviders(<DocumentsPage />);

    await openAnalysis(user);

    expect(
      await screen.findByText("Algo deu errado. Tente novamente."),
    ).toBeInTheDocument();
  });

  it("fecha com Esc", async () => {
    const user = userEvent.setup();

    useList();
    server.use(
      http.get(`${API_URL}/documents/${DOCUMENT_ID}`, () =>
        HttpResponse.json(detail),
      ),
    );
    renderWithProviders(<DocumentsPage />);

    await openAnalysis(user);
    await screen.findByLabelText("Título");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

import { waitFor as vi_waitFor } from "@testing-library/react";
