import { expect, request as playwrightRequest, test } from "@playwright/test";

import {
  blankPdf,
  cleanupE2eDocuments,
  createDocumentViaApi,
  documentCard,
  findDocumentByTitle,
  invalidImage,
  listDocuments,
  openAnalysisFromSelection,
  openDocumentsPage,
  sampleTxt,
  selectCard,
  uniqueTitle,
  uploadViaUi,
} from "./helpers";

interface MeResponse {
  name: string;
  email: string;
  picture: string | null;
}

test.describe("com sessão", () => {
  test.beforeAll(() => {
    if (!process.env.E2E_SESSION_COOKIE) {
      throw new Error(
        "E2E_SESSION_COOKIE ausente. Veja e2e/README.md para obtê-lo.",
      );
    }
  });

  test.afterEach(async ({ page }) => {
    await cleanupE2eDocuments(page.request);
  });

  test("Cenário 1 — sidebar mostra nome, e-mail e foto do usuário real", async ({
    page,
  }) => {
    const response = await page.request.get("/me");

    expect(response.status(), "GET /me").toBe(200);

    const me = (await response.json()) as MeResponse;

    await openDocumentsPage(page);

    const sidebar = page.locator('aside[aria-label="Barra lateral"]');

    await expect(sidebar.getByText(me.name, { exact: true })).toBeVisible();
    await expect(sidebar.getByText(me.email, { exact: true })).toBeVisible();

    if (me.picture) {
      await expect(sidebar.getByRole("img", { name: me.name })).toBeVisible();
    }
  });

  test("Cenário 2 — upload de TXT pequeno conclui e aparece na lista", async ({
    page,
  }) => {
    const title = uniqueTitle("upload txt");

    await openDocumentsPage(page);
    await uploadViaUi(page, {
      title,
      instruction: "Resuma o documento em duas frases.",
      file: sampleTxt(),
    });

    await expect(documentCard(page, title)).toBeVisible();
    await expect(documentCard(page, title).getByText("Falhou")).toHaveCount(0);

    const saved = await findDocumentByTitle(page.request, title);

    expect(saved?.status).toBe("COMPLETED");
  });

  test("Cenário 4 — PDF sem texto falha com selo e retry disponível", async ({
    page,
  }) => {
    const title = uniqueTitle("pdf sem texto");

    await openDocumentsPage(page);
    await uploadViaUi(page, {
      title,
      instruction: "Resuma o documento.",
      file: blankPdf(),
    });

    const card = documentCard(page, title);

    await expect(card).toBeVisible();
    await expect(card.getByText("Falhou")).toBeVisible();

    await selectCard(page, title);

    const dialog = await openAnalysisFromSelection(page);

    await expect(
      dialog.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();
  });

  test("Cenário 5 — arquivo de tipo inválido é bloqueado no cliente", async ({
    page,
  }) => {
    await openDocumentsPage(page);
    await page.getByLabel("Selecionar arquivo").setInputFiles(invalidImage());

    await expect(
      page.getByText("Formato não suportado. Envie PDF, DOCX ou TXT."),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Prévia do Documento" }),
    ).toHaveCount(0);
  });

  test("Cenário 6 — excluir remove o documento da lista e do back", async ({
    page,
  }) => {
    const title = uniqueTitle("exclusao");
    const created = await createDocumentViaApi(page.request, {
      title,
      instruction: "Resuma o documento.",
      file: blankPdf(),
    });

    await openDocumentsPage(page);
    await selectCard(page, title);

    await page.getByRole("button", { name: "1 documento selecionado" }).click();
    await page.getByRole("menuitem", { name: "Excluir documentos" }).click();

    const confirm = page.getByRole("alertdialog", {
      name: "Excluir documento?",
    });

    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Excluir", exact: true }).click();

    await expect(confirm).toBeHidden();
    await expect(documentCard(page, title)).toHaveCount(0);

    const remaining = await listDocuments(page.request);

    expect(remaining.some((item) => item.id === created.id)).toBe(false);
  });

  test("Cenário 7 — logout: /me responde 401 e rota protegida redireciona", async ({
    page,
  }) => {
    await openDocumentsPage(page);
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login$/);

    const me = await page.request.get("/me");

    expect(me.status(), "GET /me após logout").toBe(401);

    await page.goto("/app/documentos");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("sem sessão", () => {
  test("Cenário 8 — GET /documents sem sessão responde 401 no formato de erro", async () => {
    const apiUrl = process.env.E2E_API_URL;

    if (!apiUrl) {
      throw new Error("E2E_API_URL não configurada.");
    }

    const anonymous = await playwrightRequest.newContext({
      baseURL: apiUrl,
    });

    try {
      const response = await anonymous.get("/documents");

      expect(response.status()).toBe(401);

      const body = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };

      expect(body.error?.code).toBe("UNAUTHORIZED");
      expect(typeof body.error?.message).toBe("string");
    } finally {
      await anonymous.dispose();
    }
  });
});
