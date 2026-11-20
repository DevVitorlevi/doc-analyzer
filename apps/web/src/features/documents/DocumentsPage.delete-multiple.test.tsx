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
const ID_A = "00000000-0000-4000-8000-0000000000a1";
const ID_B = "00000000-0000-4000-8000-0000000000b2";
const ID_C = "00000000-0000-4000-8000-0000000000c3";

function makeItem(id: string, letter: string) {
  return {
    id,
    title: `Contrato ${letter}`,
    createdAt: "2026-11-19T12:00:00.000Z",
    sizeBytes: 34816,
    mimeType: "application/pdf",
    status: "COMPLETED",
  };
}

const ALL_ITEMS = [
  makeItem(ID_A, "A"),
  makeItem(ID_B, "B"),
  makeItem(ID_C, "C"),
];

interface ApiState {
  removed: Set<string>;
  calls: string[];
  inFlight: number;
  maxInFlight: number;
}

type DeleteBehavior = (id: string, state: ApiState) => Response;

function setupApi(onDelete: DeleteBehavior) {
  const state: ApiState = {
    removed: new Set(),
    calls: [],
    inFlight: 0,
    maxInFlight: 0,
  };

  server.use(
    http.get(`${API_URL}/documents`, () =>
      HttpResponse.json(
        ALL_ITEMS.filter((item) => !state.removed.has(item.id)),
      ),
    ),
    http.delete(`${API_URL}/documents/:id`, async ({ params }) => {
      const id = String(params.id);

      state.calls.push(id);
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      await delay(20);
      state.inFlight -= 1;

      return onDelete(id, state);
    }),
  );

  return state;
}

function succeed(id: string, state: ApiState) {
  state.removed.add(id);
  return new HttpResponse(null, { status: 204 });
}

function failWith500() {
  return HttpResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "bruta do servidor" } },
    { status: 500 },
  );
}

function renderPage() {
  return renderWithProviders(
    <>
      <Toaster theme="light" />
      <DocumentsPage />
    </>,
  );
}

function card(letter: string) {
  return screen.getByRole("checkbox", {
    name: new RegExp(`Contrato ${letter}`),
  });
}

async function selectAndOpenConfirmation(
  user: ReturnType<typeof userEvent.setup>,
  letters: string[],
  title: string,
) {
  for (const letter of letters) {
    await user.click(
      await screen.findByRole("checkbox", {
        name: new RegExp(`Contrato ${letter}`),
      }),
    );
  }

  await user.click(
    screen.getByRole("button", {
      name:
        letters.length === 1
          ? "1 documento selecionado"
          : `${letters.length} documentos selecionados`,
    }),
  );
  await user.click(
    await screen.findByRole("menuitem", { name: "Excluir documentos" }),
  );

  return screen.findByRole("alertdialog", { name: title });
}

afterEach(() => {
  toast.dismiss();
});

describe("DocumentsPage — exclusão de vários documentos", () => {
  it("mostra a confirmação com a contagem e Cancelar não exclui nada", async () => {
    const user = userEvent.setup();
    const state = setupApi(succeed);

    renderPage();

    const dialog = await selectAndOpenConfirmation(
      user,
      ["A", "B"],
      "Excluir 2 documentos?",
    );

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(state.calls).toEqual([]);
    expect(card("A")).toHaveAttribute("aria-checked", "true");
    expect(card("B")).toHaveAttribute("aria-checked", "true");
  });

  it("exclui em sequência, sem paralelismo, e mostra o toast de sucesso total", async () => {
    const user = userEvent.setup();
    const state = setupApi(succeed);

    renderPage();

    const dialog = await selectAndOpenConfirmation(
      user,
      ["A", "B"],
      "Excluir 2 documentos?",
    );

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      within(dialog).getByRole("button", { name: "Excluindo…" }),
    ).toHaveAttribute("aria-disabled", "true");

    expect(
      await screen.findByText("2 documentos excluídos."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("checkbox", { name: /Contrato A/ }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: /Contrato B/ }),
    ).not.toBeInTheDocument();
    expect(card("C")).toHaveAttribute("aria-checked", "false");
    expect(
      screen.queryByRole("button", { name: /selecionado/ }),
    ).not.toBeInTheDocument();
    expect(state.calls).toEqual([ID_A, ID_B]);
    expect(state.maxInFlight).toBe(1);
  });

  it("em falha parcial continua o laço, mostra a contagem e mantém selecionados os que falharam", async () => {
    const user = userEvent.setup();
    const state = setupApi((id, current) =>
      id === ID_B ? failWith500() : succeed(id, current),
    );

    renderPage();

    const dialog = await selectAndOpenConfirmation(
      user,
      ["A", "B", "C"],
      "Excluir 3 documentos?",
    );

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText(
        "2 de 3 documentos excluídos. Não foi possível excluir 1.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("checkbox", { name: /Contrato A/ }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: /Contrato C/ }),
    ).not.toBeInTheDocument();
    expect(card("B")).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("button", { name: "1 documento selecionado" }),
    ).toBeInTheDocument();
    expect(state.calls).toEqual([ID_A, ID_B, ID_C]);
    expect(state.maxInFlight).toBe(1);
    expect(screen.queryByText(/bruta do servidor/)).not.toBeInTheDocument();
  });

  it("conta 404 como já removido", async () => {
    const user = userEvent.setup();

    setupApi((id, state) => {
      if (id === ID_B) {
        state.removed.add(id);

        return HttpResponse.json(
          { error: { code: "NOT_FOUND", message: "bruta do servidor" } },
          { status: 404 },
        );
      }

      return succeed(id, state);
    });
    renderPage();

    const dialog = await selectAndOpenConfirmation(
      user,
      ["A", "B"],
      "Excluir 2 documentos?",
    );

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("2 documentos excluídos."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("checkbox")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: /Contrato B/ }),
    ).not.toBeInTheDocument();
  });

  it("quando todas as exclusões falham, informa a contagem e mantém todos selecionados", async () => {
    const user = userEvent.setup();
    const state = setupApi(() => failWith500());

    renderPage();

    const dialog = await selectAndOpenConfirmation(
      user,
      ["A", "B"],
      "Excluir 2 documentos?",
    );

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText(
        "0 de 2 documentos excluídos. Não foi possível excluir 2.",
      ),
    ).toBeInTheDocument();
    expect(card("A")).toHaveAttribute("aria-checked", "true");
    expect(card("B")).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("button", { name: "2 documentos selecionados" }),
    ).toBeInTheDocument();
    expect(state.calls).toEqual([ID_A, ID_B]);
  });

  it("duplo clique em Excluir não repete as requisições", async () => {
    const user = userEvent.setup();
    const state = setupApi(succeed);

    renderPage();

    const dialog = await selectAndOpenConfirmation(
      user,
      ["A", "B"],
      "Excluir 2 documentos?",
    );

    await user.dblClick(
      within(dialog).getByRole("button", { name: "Excluir" }),
    );

    expect(
      await screen.findByText("2 documentos excluídos."),
    ).toBeInTheDocument();
    expect(state.calls).toEqual([ID_A, ID_B]);
  });
});

