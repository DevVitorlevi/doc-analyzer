import { http, HttpResponse, delay } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { toast, Toaster } from "sonner";

import { server } from "@/test/server";
import {
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  within,
} from "@/test/test-utils";

import DocumentsPage from "./DocumentsPage";

const API_URL = "http://localhost:3333";
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000020";
const MODAL_TITLE = "Análise da IA";
const RETRY_LABEL = "Tentar novamente";
const TIMEOUT_MESSAGE = "A análise demorou mais que o esperado.";
const AI_ERROR_MESSAGE = "A IA não conseguiu concluir a análise.";
const SUCCESS_MESSAGE = "Documento analisado com sucesso.";
const CONFLICT_MESSAGE = "Este documento não pode ser reprocessado agora.";
const NOT_FOUND_MESSAGE = "Documento não encontrado.";

type Status = "COMPLETED" | "FAILED" | "PROCESSING";

function makeDetail(
  status: Status,
  errorCode: string | null = null,
  analysis: string | null = null,
) {
  return {
    id: DOCUMENT_ID,
    title: "Contrato de locação",
    createdAt: "2026-11-19T12:00:00.000Z",
    sizeBytes: 34816,
    mimeType: "application/pdf",
    status,
    instruction: "INSTRUCAO",
    analysis,
    truncated: false,
    errorCode,
    errorMessage: errorCode === null ? null : "bruta do servidor",
    originalName: "contrato.pdf",
    fileUrl: "https://example.com/contrato.pdf",
  };
}

type Detail = ReturnType<typeof makeDetail>;

interface ApiState {
  current: Detail;
  list: number;
  detail: number;
  retry: number;
}

function setupApi(initial: Detail, onRetry: (state: ApiState) => Response) {
  const state: ApiState = { current: initial, list: 0, detail: 0, retry: 0 };

  server.use(
    http.get(`${API_URL}/documents`, () => {
      state.list += 1;

      const { id, title, createdAt, sizeBytes, mimeType, status } =
        state.current;

      return HttpResponse.json([
        { id, title, createdAt, sizeBytes, mimeType, status },
      ]);
    }),
    http.get(`${API_URL}/documents/${DOCUMENT_ID}`, () => {
      state.detail += 1;
      return HttpResponse.json(state.current);
    }),
    http.post(`${API_URL}/documents/${DOCUMENT_ID}/retry`, async () => {
      state.retry += 1;
      await delay(30);
      return onRetry(state);
    }),
  );

  return state;
}

function renderPage() {
  return renderWithProviders(
    <>
      <Toaster theme="light" />
      <DocumentsPage />
    </>,
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

  return screen.findByRole("dialog", { name: MODAL_TITLE });
}

afterEach(() => {
  toast.dismiss();
});

describe("DocumentsPage — retry no modal de análise", () => {
  it("mostra a mensagem do errorCode e o botão para documento FAILED", async () => {
    const user = userEvent.setup();

    setupApi(makeDetail("FAILED", "AI_TIMEOUT"), () =>
      HttpResponse.json(makeDetail("FAILED", "AI_TIMEOUT")),
    );
    renderPage();

    const dialog = await openAnalysis(user);

    expect(
      await within(dialog).findByText(TIMEOUT_MESSAGE),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: RETRY_LABEL }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/bruta do servidor/)).not.toBeInTheDocument();
  });

  it("não mostra o botão para documento COMPLETED", async () => {
    const user = userEvent.setup();

    setupApi(makeDetail("COMPLETED", null, "Texto"), () =>
      HttpResponse.json(makeDetail("COMPLETED", null, "Texto")),
    );
    renderPage();

    const dialog = await openAnalysis(user);

    await within(dialog).findByRole("region", { name: "Análise da IA" });
    expect(
      within(dialog).queryByRole("button", { name: RETRY_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("mostra 'Processando' sem botão para documento PROCESSING", async () => {
    const user = userEvent.setup();

    setupApi(makeDetail("PROCESSING"), () =>
      HttpResponse.json(makeDetail("PROCESSING")),
    );
    renderPage();

    const dialog = await openAnalysis(user);

    expect(await within(dialog).findByText("Processando")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: RETRY_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("com retry COMPLETED mostra a análise, o toast de sucesso e atualiza o card", async () => {
    const user = userEvent.setup();

    const state = setupApi(makeDetail("FAILED", "AI_TIMEOUT"), (current) => {
      current.current = makeDetail("COMPLETED", null, "Nova análise");
      return HttpResponse.json(current.current);
    });
    renderPage();

    const dialog = await openAnalysis(user);
    const button = await within(dialog).findByRole("button", {
      name: RETRY_LABEL,
    });
    const listCallsBefore = state.list;

    await user.click(button);

    expect(button).toHaveAttribute("aria-disabled", "true");

    const analysis = await within(dialog).findByRole("region", {
      name: "Análise da IA",
    });

    expect(analysis).toHaveTextContent("Nova análise");
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: RETRY_LABEL }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(state.list).toBeGreaterThan(listCallsBefore));
    await waitFor(() =>
      expect(screen.queryByText("Falhou")).not.toBeInTheDocument(),
    );
  });

  it("com retry FAILED de novo atualiza o erro e mostra o toast", async () => {
    const user = userEvent.setup();

    setupApi(makeDetail("FAILED", "AI_TIMEOUT"), (current) => {
      current.current = makeDetail("FAILED", "AI_ERROR");
      return HttpResponse.json(current.current);
    });
    renderPage();

    const dialog = await openAnalysis(user);

    await user.click(
      await within(dialog).findByRole("button", { name: RETRY_LABEL }),
    );

    await waitFor(() =>
      expect(screen.getAllByText(AI_ERROR_MESSAGE)).toHaveLength(2),
    );
    expect(screen.queryByText(TIMEOUT_MESSAGE)).not.toBeInTheDocument();
  });

  it("em 409 mostra o toast e recarrega o detalhe", async () => {
    const user = userEvent.setup();

    const state = setupApi(makeDetail("FAILED", "AI_TIMEOUT"), () =>
      HttpResponse.json(
        { error: { code: "CONFLICT", message: "bruta do servidor" } },
        { status: 409 },
      ),
    );
    renderPage();

    const dialog = await openAnalysis(user);
    const button = await within(dialog).findByRole("button", {
      name: RETRY_LABEL,
    });
    const detailCallsBefore = state.detail;

    await user.click(button);

    expect(await screen.findByText(CONFLICT_MESSAGE)).toBeInTheDocument();
    await waitFor(() =>
      expect(state.detail).toBeGreaterThan(detailCallsBefore),
    );
    expect(screen.queryByText(/bruta do servidor/)).not.toBeInTheDocument();
  });

  it("em 404 mostra o toast, fecha o modal e recarrega a lista", async () => {
    const user = userEvent.setup();

    const state = setupApi(makeDetail("FAILED", "AI_TIMEOUT"), () =>
      HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "bruta do servidor" } },
        { status: 404 },
      ),
    );
    renderPage();

    const dialog = await openAnalysis(user);
    const button = await within(dialog).findByRole("button", {
      name: RETRY_LABEL,
    });
    const listCallsBefore = state.list;

    await user.click(button);

    expect(await screen.findByText(NOT_FOUND_MESSAGE)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(state.list).toBeGreaterThan(listCallsBefore));
  });

  it("duplo clique em Tentar novamente gera uma única requisição", async () => {
    const user = userEvent.setup();

    const state = setupApi(makeDetail("FAILED", "AI_TIMEOUT"), (current) => {
      current.current = makeDetail("COMPLETED", null, "Texto");
      return HttpResponse.json(current.current);
    });
    renderPage();

    const dialog = await openAnalysis(user);

    await user.dblClick(
      await within(dialog).findByRole("button", { name: RETRY_LABEL }),
    );

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(state.retry).toBe(1);
  });
});
