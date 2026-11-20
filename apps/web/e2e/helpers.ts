import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const DOC_PREFIX = "E2E-";
const RUN_ID = Date.now().toString(36);

export function uniqueTitle(label: string): string {
  return `${DOC_PREFIX}${RUN_ID} ${label}`;
}

export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ApiDocument {
  id: string;
  title: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
}

export function sampleTxt(): FilePayload {
  const text = [
    "Relatório interno de exemplo para teste automatizado.",
    "A equipe revisou três contratos de prestação de serviços.",
    "O primeiro contrato prevê prazo de doze meses e renovação automática.",
    "O segundo contrato define multa de dois por cento por atraso no pagamento.",
    "O terceiro contrato não possui cláusula de confidencialidade.",
    "Recomenda-se incluir essa cláusula antes da assinatura.",
  ].join("\n");

  return {
    name: "e2e-exemplo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(text, "utf-8"),
  };
}

export function blankPdf(): FilePayload {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefStart}\n%%EOF\n`;

  return {
    name: "e2e-sem-texto.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(body, "latin1"),
  };
}

export function invalidImage(): FilePayload {
  return {
    name: "e2e-invalido.png",
    mimeType: "image/png",
    buffer: Buffer.from("not-a-real-image", "utf-8"),
  };
}

export async function openDocumentsPage(page: Page): Promise<void> {
  await page.goto("/app/documentos");
  await expect(
    page.getByRole("heading", { name: "Documentos", level: 1, exact: true }),
  ).toBeVisible();
}

export async function listDocuments(
  request: APIRequestContext,
): Promise<ApiDocument[]> {
  const response = await request.get("/documents");

  expect(response.status(), "GET /documents").toBe(200);

  return (await response.json()) as ApiDocument[];
}

export async function findDocumentByTitle(
  request: APIRequestContext,
  title: string,
): Promise<ApiDocument | undefined> {
  const documents = await listDocuments(request);

  return documents.find((item) => item.title === title);
}

export async function createDocumentViaApi(
  request: APIRequestContext,
  input: { title: string; instruction: string; file: FilePayload },
): Promise<ApiDocument> {
  const response = await request.post("/documents", {
    multipart: {
      title: input.title,
      instruction: input.instruction,
      file: input.file,
    },
    timeout: 150_000,
  });

  expect(response.status(), "POST /documents").toBe(201);

  return (await response.json()) as ApiDocument;
}

export async function uploadViaUi(
  page: Page,
  input: { title: string; instruction: string; file: FilePayload },
): Promise<void> {
  await page.getByLabel("Selecionar arquivo").setInputFiles(input.file);

  const dialog = page.getByRole("dialog", { name: "Prévia do Documento" });

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Título").fill(input.title);
  await dialog.getByLabel("Instrução para IA").fill(input.instruction);
  await dialog.getByRole("button", { name: "Salvar" }).click();

  await expect(dialog).toBeHidden({ timeout: 150_000 });
}

export function documentCard(page: Page, title: string) {
  return page.getByRole("checkbox", { name: title, exact: true });
}

export async function selectCard(page: Page, title: string): Promise<void> {
  const card = documentCard(page, title);

  await card.click();
  await expect(card).toBeChecked();
}

export async function openAnalysisFromSelection(page: Page) {
  await page.getByRole("button", { name: "1 documento selecionado" }).click();
  await page.getByRole("menuitem", { name: "Visualizar análise" }).click();

  const dialog = page.getByRole("dialog", { name: "Análise da IA" });

  await expect(dialog).toBeVisible();

  return dialog;
}

export async function cleanupE2eDocuments(
  request: APIRequestContext,
): Promise<void> {
  const response = await request.get("/documents");

  if (!response.ok()) {
    return;
  }

  const documents = (await response.json()) as ApiDocument[];

  for (const item of documents) {
    if (!item.title.startsWith(DOC_PREFIX)) {
      continue;
    }

    const removal = await request.delete(`/documents/${item.id}`);

    if (removal.status() !== 204 && removal.status() !== 404) {
      throw new Error(
        `Falha ao remover documento de teste (HTTP ${removal.status()}).`,
      );
    }
  }
}
