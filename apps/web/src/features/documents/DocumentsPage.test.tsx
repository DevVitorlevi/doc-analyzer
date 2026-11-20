import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/server";
import { renderWithProviders, screen, userEvent } from "@/test/test-utils";

import DocumentsPage from "./DocumentsPage";

const API_URL = "http://localhost:3333";
const EMPTY_TITLE = "Você ainda não tem documentos";
const EMPTY_DESCRIPTION =
  "Clique em “Adicionar documento” para enviar um arquivo PDF, DOCX ou TXT.";
const ERROR_MESSAGE = "Não foi possível carregar seus documentos.";

const documentListItem = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Contrato",
  createdAt: "2026-11-19T12:00:00.000Z",
  sizeBytes: 34816,
  mimeType: "application/pdf",
  status: "COMPLETED",
};

describe("DocumentsPage", () => {
  it("exibe o título e mostra loading em vez do estado vazio durante o carregamento", async () => {
    let releaseRequest!: () => void;

    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });

    server.use(
      http.get(`${API_URL}/documents`, async () => {
        await requestGate;
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<DocumentsPage />);

    expect(
      screen.getByRole("heading", { name: "Documentos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando documentos...",
    );
    expect(
      screen.queryByRole("heading", { name: EMPTY_TITLE }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Adicionar documento" }),
    ).not.toBeInTheDocument();

    releaseRequest();

    expect(
      await screen.findByRole("heading", { name: EMPTY_TITLE }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("exibe o estado vazio com os textos aprovados e a ação de adicionar", async () => {
    renderWithProviders(<DocumentsPage />);

    expect(
      await screen.findByRole("heading", { name: EMPTY_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByText(EMPTY_DESCRIPTION)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adicionar documento" }),
    ).toBeEnabled();
  });

  it("exibe erro sem texto do servidor e refaz a consulta ao tentar novamente", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(
        `${API_URL}/documents`,
        () =>
          HttpResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "detalhe técnico do servidor",
              },
            },
            { status: 500 },
          ),
        { once: true },
      ),
    );

    renderWithProviders(<DocumentsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(ERROR_MESSAGE);
    expect(
      screen.queryByText("detalhe técnico do servidor"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: EMPTY_TITLE }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByRole("heading", { name: EMPTY_TITLE }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("não exibe o estado vazio quando a lista possui documentos", async () => {
    server.use(
      http.get(`${API_URL}/documents`, () =>
        HttpResponse.json([documentListItem]),
      ),
    );

    renderWithProviders(<DocumentsPage />);

    expect(
      await screen.findByRole("button", { name: "Adicionar documento" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: EMPTY_TITLE }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
