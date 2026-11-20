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
const DOCUMENT_ID = "00000000-0000-4000-8000-000000000030";
const CONFIRM_TITLE = "Excluir documento?";
const SUCCESS_MESSAGE = "Documento excluído.";
const SERVER_ERROR_MESSAGE = "Algo deu errado. Tente novamente.";
const STORAGE_ERROR_MESSAGE =
  "Falha ao acessar o armazenamento do arquivo. Tente novamente.";

const LIST_ITEM = {
  id: DOCUMENT_ID,
  title: "Contrato de locação",
  createdAt: "2026-11-19T12:00:00.000Z",
  sizeBytes: 34816,
  mimeType: "application/pdf",
  status: "COMPLETED",
};

interface ApiState {
  removed: boolean;
  deleteCalls: number;
}

function setupApi(onDelete: (state: ApiState) => Response) {
  const state: ApiState = { removed: false, deleteCalls: 0 };

  server.use(
    http.get(`${API_URL}/documents`, () =>
      HttpResponse.json(state.removed ? [] : [LIST_ITEM]),
    ),
    http.delete(`${API_URL}/documents/${DOCUMENT_ID}`, async () => {
      state.deleteCalls += 1;
      await delay(30);
      return onDelete(state);
    }),
  );

  return state;
}

function removeAndRespond204(state: ApiState) {
  state.removed = true;
  return new HttpResponse(null, { status: 204 });
}

function renderPage() {
  return renderWithProviders(
    <>
      <Toaster theme="light" />
      <DocumentsPage />
    </>,
  );
}

async function openConfirmation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("checkbox", { name: /Contrato/ }));
  await user.click(
    screen.getByRole("button", { name: "1 documento selecionado" }),
  );
  await user.click(
    await screen.findByRole("menuitem", { name: "Excluir documentos" }),
  );

  return screen.findByRole("alertdialog", { name: CONFIRM_TITLE });
}

afterEach(() => {
  toast.dismiss();
});

describe("DocumentsPage — exclusão de um documento", () => {
  it("pede confirmação antes de excluir, com foco em Cancelar, e Cancelar não exclui", async () => {
    const user = userEvent.setup();
    const state = setupApi(removeAndRespond204);

    renderPage();

    const dialog = await openConfirmation(user);
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" });

    expect(
      within(dialog).getByText(
        "Esta ação remove o arquivo e a análise e não pode ser desfeita.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(state.deleteCalls).toBe(0);

    await user.click(cancel);

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(state.deleteCalls).toBe(0);
    expect(
      screen.getByRole("checkbox", { name: /Contrato/ }),
    ).toBeInTheDocument();
  });

  it("ao confirmar mostra loading, toast de sucesso, remove o card e limpa a seleção", async () => {
    const user = userEvent.setup();
    const state = setupApi(removeAndRespond204);

    renderPage();

    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      within(dialog).getByRole("button", { name: "Excluindo…" }),
    ).toHaveAttribute("aria-disabled", "true");

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /selecionado/ }),
    ).not.toBeInTheDocument();
    expect(state.deleteCalls).toBe(1);
  });

  it("duplo clique em Excluir gera uma única requisição", async () => {
    const user = userEvent.setup();
    const state = setupApi(removeAndRespond204);

    renderPage();

    const dialog = await openConfirmation(user);

    await user.dblClick(
      within(dialog).getByRole("button", { name: "Excluir" }),
    );

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(state.deleteCalls).toBe(1);
  });

  it("em 404 trata como já removido", async () => {
    const user = userEvent.setup();

    setupApi((state) => {
      state.removed = true;
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "bruta do servidor" } },
        { status: 404 },
      );
    });
    renderPage();

    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(/bruta do servidor/)).not.toBeInTheDocument();
  });

  it("em 500 mostra toast de erro e o card permanece", async () => {
    const user = userEvent.setup();

    setupApi(() =>
      HttpResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "bruta do servidor" } },
        { status: 500 },
      ),
    );
    renderPage();

    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(SERVER_ERROR_MESSAGE)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("checkbox", { name: /Contrato/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/bruta do servidor/)).not.toBeInTheDocument();
  });

  it("em 502 mostra o toast de armazenamento e o card permanece", async () => {
    const user = userEvent.setup();

    setupApi(() =>
      HttpResponse.json(
        { error: { code: "STORAGE_ERROR", message: "bruta do servidor" } },
        { status: 502 },
      ),
    );
    renderPage();

    const dialog = await openConfirmation(user);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(STORAGE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Contrato/ }),
    ).toBeInTheDocument();
  });
});
