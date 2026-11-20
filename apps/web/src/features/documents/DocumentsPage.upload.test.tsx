import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { toast, Toaster } from "sonner";
import { API_BASE_URL } from "@/lib/http";

import { server } from "@/test/server";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
} from "@/test/test-utils";

import DocumentsPage from "./DocumentsPage";

const API_URL = API_BASE_URL;
const FILE_INPUT_LABEL = "Selecionar arquivo";
const MODAL_TITLE = "Prévia do Documento";
const INSTRUCTION = "Resuma o contrato";
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000010";
const SUCCESS_MESSAGE = "Documento analisado com sucesso.";
const UNREADABLE_MESSAGE = "Não foi possível ler o texto deste arquivo.";
const TOO_LARGE_MESSAGE = "O arquivo excede o limite de 10 MB.";
const UNSUPPORTED_MESSAGE = "Formato não suportado. Envie PDF, DOCX ou TXT.";
const GENERIC_MESSAGE = "Algo deu errado. Tente novamente.";
const SERVER_DETAIL = "detalhe técnico do servidor";

function makeDocumentResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: DOCUMENT_ID,
    title: "contrato.pdf",
    instruction: INSTRUCTION,
    status: "COMPLETED",
    analysis: "Análise de teste.",
    truncated: false,
    errorCode: null,
    errorMessage: null,
    originalName: "contrato.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    createdAt: "2026-11-20T12:00:00.000Z",
    ...overrides,
  };
}

function makeListItem(status: string) {
  return {
    id: DOCUMENT_ID,
    title: "contrato.pdf",
    createdAt: "2026-11-20T12:00:00.000Z",
    sizeBytes: 1024,
    mimeType: "application/pdf",
    status,
  };
}

function mockDocumentsApi(options: {
  listStatus: string;
  post: () => Response | Promise<Response>;
}) {
  const state = { postCount: 0 };
  let uploaded = false;

  server.use(
    http.get(`${API_URL}/documents`, () =>
      HttpResponse.json(uploaded ? [makeListItem(options.listStatus)] : []),
    ),
    http.post(`${API_URL}/documents`, async () => {
      state.postCount += 1;

      const response = await options.post();

      if (response.ok) {
        uploaded = true;
      }

      return response;
    }),
  );

  return state;
}

function apiError(status: number, code: string) {
  return HttpResponse.json(
    { error: { code, message: SERVER_DETAIL } },
    { status },
  );
}

async function chooseFileAndFillForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Adicionar documento" });

  await user.upload(
    screen.getByLabelText(FILE_INPUT_LABEL),
    new File(["x"], "contrato.pdf", { type: "application/pdf" }),
  );

  await screen.findByRole("dialog", { name: MODAL_TITLE });
  await user.type(screen.getByLabelText("Instrução para IA"), INSTRUCTION);
}

function renderPage() {
  return renderWithProviders(
    <>
      <Toaster theme="light" />
      <DocumentsPage />
    </>,
  );
}

async function expectModalClosed() {
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
}

afterEach(() => {
  toast.dismiss();
});

describe("DocumentsPage — envio de documento", () => {
  it("201 COMPLETED: mostra toast de sucesso, fecha o modal e exibe o card", async () => {
    const user = userEvent.setup();

    mockDocumentsApi({
      listStatus: "COMPLETED",
      post: () => HttpResponse.json(makeDocumentResponse(), { status: 201 }),
    });

    renderPage();
    await chooseFileAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    await expectModalClosed();
    expect(
      await screen.findByRole("checkbox", { name: "contrato.pdf" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Falhou")).not.toBeInTheDocument();
  });

  it("201 FAILED: mostra o erro por errorCode, fecha o modal e exibe o card com selo Falhou", async () => {
    const user = userEvent.setup();

    mockDocumentsApi({
      listStatus: "FAILED",
      post: () =>
        HttpResponse.json(
          makeDocumentResponse({
            status: "FAILED",
            analysis: null,
            errorCode: "UNREADABLE_FILE",
            errorMessage: SERVER_DETAIL,
          }),
          { status: 201 },
        ),
    });

    renderPage();
    await chooseFileAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(UNREADABLE_MESSAGE)).toBeInTheDocument();
    await expectModalClosed();
    expect(await screen.findByText("Falhou")).toBeInTheDocument();
    expect(screen.queryByText(SERVER_DETAIL)).not.toBeInTheDocument();
  });

  it("201 PROCESSING: fecha o modal e exibe o card com selo Processando", async () => {
    const user = userEvent.setup();

    mockDocumentsApi({
      listStatus: "PROCESSING",
      post: () =>
        HttpResponse.json(
          makeDocumentResponse({ status: "PROCESSING", analysis: null }),
          { status: 201 },
        ),
    });

    renderPage();
    await chooseFileAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await expectModalClosed();
    expect(await screen.findByText("Processando")).toBeInTheDocument();
    expect(screen.queryByText(SUCCESS_MESSAGE)).not.toBeInTheDocument();
  });

  it("413: mostra a mensagem mapeada, mantém o modal aberto e preserva os dados", async () => {
    const user = userEvent.setup();

    mockDocumentsApi({
      listStatus: "COMPLETED",
      post: () => apiError(413, "FILE_TOO_LARGE"),
    });

    renderPage();
    await chooseFileAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(TOO_LARGE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("contrato.pdf");
    expect(screen.getByLabelText("Instrução para IA")).toHaveValue(INSTRUCTION);
    expect(screen.queryByText(SERVER_DETAIL)).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
  });

  it("415: mostra a mensagem de formato não suportado e mantém o modal aberto", async () => {
    const user = userEvent.setup();

    mockDocumentsApi({
      listStatus: "COMPLETED",
      post: () => apiError(415, "UNSUPPORTED_FILE_TYPE"),
    });

    renderPage();
    await chooseFileAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(UNSUPPORTED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falha de rede: mostra mensagem genérica, mantém o modal aberto e permite tentar de novo", async () => {
    const user = userEvent.setup();

    let shouldFail = true;

    const state = mockDocumentsApi({
      listStatus: "COMPLETED",
      post: () =>
        shouldFail
          ? HttpResponse.error()
          : HttpResponse.json(makeDocumentResponse(), { status: 201 }),
    });

    renderPage();
    await chooseFileAndFillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(GENERIC_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Instrução para IA")).toHaveValue(INSTRUCTION);

    shouldFail = false;

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    await expectModalClosed();
    expect(state.postCount).toBe(2);
  });
});
