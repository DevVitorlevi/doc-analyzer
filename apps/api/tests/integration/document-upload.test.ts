import { beforeEach, describe, expect, it } from "vitest";

import { AiAnalysisError } from "@/integrations/openai/ai-analysis-error";

import { createFakeDocumentAnalyzer } from "../helpers/fake-document-analyzer";
import { createFakeStorage } from "../helpers/fake-storage";
import { makeDocx, makePdf } from "../helpers/document-fixtures";
import { useIntegrationDatabase } from "../helpers/integration-hooks";
import { loginAndGetCookie } from "../helpers/login";
import { buildMultipartBody, type MultipartPart } from "../helpers/multipart";
import { runAnalysisWorker } from "../helpers/run-analysis-worker";

const storageFake = createFakeStorage();
const analyzerFake = createFakeDocumentAnalyzer();

describe("POST /documents", () => {
  const { getApp } = useIntegrationDatabase({
    storage: storageFake.storage,
    documentAnalyzer: analyzerFake.analyzer,
  });

  beforeEach(() => {
    storageFake.reset();
    analyzerFake.reset();
  });

  async function upload(parts: MultipartPart[], cookie?: string) {
    const { payload, contentType } = buildMultipartBody(parts);

    return getApp().inject({
      method: "POST",
      url: "/documents",
      payload,
      headers: {
        "content-type": contentType,
        ...(cookie ? { cookie } : {}),
      },
    });
  }

  function fields(title = "Contrato", instruction = "Resuma o documento") {
    return [
      { name: "title", value: title },
      { name: "instruction", value: instruction },
    ];
  }

  function filePart(
    filename: string,
    content: Buffer,
    contentType = "application/octet-stream",
    name = "file",
  ) {
    return { name, filename, contentType, content };
  }

  async function runWorker(): Promise<void> {
    await runAnalysisWorker(getApp(), {
      storage: storageFake.storage,
      analyzer: analyzerFake.analyzer,
    });
  }

  async function expectNothingPersisted(): Promise<void> {
    expect(await getApp().prisma.document.count()).toBe(0);
    expect(storageFake.objects.size).toBe(0);
  }

  it("rejects an unauthenticated request", async () => {
    const response = await upload([
      ...fields(),
      filePart("a.txt", Buffer.from("texto")),
    ]);

    expect(response.statusCode).toBe(401);
    await expectNothingPersisted();
  });

  it("uploads, analyzes and completes a TXT document", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const content = Buffer.from("Cláusula primeira: o contrato vale um ano.");

    const response = await upload(
      [...fields(), filePart("contrato.txt", content, "text/plain")],
      cookie,
    );

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body).toMatchObject({
      title: "Contrato",
      instruction: "Resuma o documento",
      status: "PROCESSING",
      analysis: null,
      truncated: false,
      errorCode: null,
      originalName: "contrato.txt",
      mimeType: "text/plain",
      sizeBytes: content.length,
    });

    expect(body).not.toHaveProperty("s3Key");
    expect(body).not.toHaveProperty("userId");

    const user = await getApp().prisma.user.findFirstOrThrow();
    const stored = storageFake.objects.get(`${user.id}/${body.id}.txt`);

    expect(stored?.body.equals(content)).toBe(true);
    expect(stored?.contentType).toBe("text/plain");

    const record = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: body.id },
    });

    expect(record.userId).toBe(user.id);
    expect(record.status).toBe("PROCESSING");
    expect(record.s3Key).toBe(`${user.id}/${body.id}.txt`);

    await runWorker();

    const completed = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: body.id },
    });

    expect(completed).toMatchObject({
      status: "COMPLETED",
      analysis: analyzerFake.defaultResponse,
      truncated: false,
      errorCode: null,
    });
  });

  it.each([
    {
      label: "PDF",
      filename: "relatorio.pdf",
      extension: "pdf",
      mimeType: "application/pdf",
      build: async () => makePdf([["Texto do relatório em PDF"]]),
    },
    {
      label: "DOCX",
      filename: "relatorio.docx",
      extension: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      build: async () => makeDocx(["Texto do relatório em DOCX"]),
    },
  ])("analyzes a $label document", async (testCase) => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [...fields(), filePart(testCase.filename, await testCase.build())],
      cookie,
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: "PROCESSING",
      mimeType: testCase.mimeType,
    });
    expect(analyzerFake.calls).toHaveLength(0);

    await runWorker();

    const saved = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: response.json().id },
    });

    expect(saved.status).toBe("COMPLETED");
    expect(analyzerFake.calls).toHaveLength(1);
    expect(analyzerFake.calls[0]?.text).toContain("Texto do relatório");

    const user = await getApp().prisma.user.findFirstOrThrow();
    const key = `${user.id}/${response.json().id}.${testCase.extension}`;

    expect(storageFake.objects.has(key)).toBe(true);
  });

  it("flags truncated text", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [...fields(), filePart("longo.txt", Buffer.from("a".repeat(70000)))],
      cookie,
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: "PROCESSING",
      truncated: false,
    });

    await runWorker();

    const saved = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: response.json().id },
    });

    expect(saved).toMatchObject({ status: "COMPLETED", truncated: true });
    expect(analyzerFake.calls[0]?.truncated).toBe(true);
    expect(analyzerFake.calls[0]?.text).toHaveLength(60000);
  });

  it("returns 201 with FAILED when the AI fails, keeping file and record", async () => {
    const cookie = await loginAndGetCookie(getApp());
    analyzerFake.failWith(new AiAnalysisError("AI_TIMEOUT"));

    const response = await upload(
      [...fields(), filePart("contrato.txt", Buffer.from("conteúdo"))],
      cookie,
    );

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body).toMatchObject({
      status: "PROCESSING",
      errorCode: null,
      analysis: null,
    });

    await runWorker();

    const record = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: body.id },
    });

    expect(record).toMatchObject({
      status: "FAILED",
      errorCode: "AI_TIMEOUT",
      analysis: null,
    });
    expect(record.errorMessage).toEqual(expect.any(String));
    expect(storageFake.objects.has(record.s3Key)).toBe(true);
  });

  it("marks a PDF without text as FAILED/UNREADABLE_FILE without calling the AI", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [...fields(), filePart("escaneado.pdf", makePdf([[]]))],
      cookie,
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: "PROCESSING",
      errorCode: null,
    });

    await runWorker();

    const saved = await getApp().prisma.document.findUniqueOrThrow({
      where: { id: response.json().id },
    });

    expect(saved).toMatchObject({
      status: "FAILED",
      errorCode: "UNREADABLE_FILE",
    });
    expect(analyzerFake.calls).toHaveLength(0);
  });

  it("rejects an unsupported file type", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const png = Buffer.concat([
      Buffer.from("89504e470d0a1a0a", "hex"),
      Buffer.alloc(64),
    ]);

    const response = await upload(
      [...fields(), filePart("imagem.png", png, "image/png")],
      cookie,
    );

    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe("UNSUPPORTED_FILE_TYPE");
    await expectNothingPersisted();
  });

  it("rejects a .txt file that is not UTF-8", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [
        ...fields(),
        filePart("cafe.txt", Buffer.from([0x63, 0x61, 0x66, 0xe9])),
      ],
      cookie,
    );

    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe("UNSUPPORTED_FILE_TYPE");
    await expectNothingPersisted();
  });

  it("rejects a file larger than the limit", async () => {
    const cookie = await loginAndGetCookie(getApp());
    const tooLarge = Buffer.alloc(10 * 1024 * 1024 + 1, "a");

    const response = await upload(
      [...fields(), filePart("grande.txt", tooLarge)],
      cookie,
    );

    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe("FILE_TOO_LARGE");
    await expectNothingPersisted();
  });

  it("rejects a missing title", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [
        { name: "instruction", value: "Resuma" },
        filePart("a.txt", Buffer.from("texto")),
      ],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "O título é obrigatório." },
    });
    await expectNothingPersisted();
  });

  it("rejects a title longer than 120 characters", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [...fields("t".repeat(121)), filePart("a.txt", Buffer.from("texto"))],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await expectNothingPersisted();
  });

  it("rejects a missing instruction", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [
        { name: "title", value: "Contrato" },
        filePart("a.txt", Buffer.from("texto")),
      ],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await expectNothingPersisted();
  });

  it("rejects an instruction longer than 2000 characters", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [
        ...fields("Contrato", "i".repeat(2001)),
        filePart("a.txt", Buffer.from("texto")),
      ],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await expectNothingPersisted();
  });

  it("rejects an empty file", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [...fields(), filePart("vazio.txt", Buffer.alloc(0))],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await expectNothingPersisted();
  });

  it("rejects a file sent using the wrong field name", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [
        ...fields(),
        filePart("a.txt", Buffer.from("texto"), "text/plain", "attachment"),
      ],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    await expectNothingPersisted();
  });

  it("rejects repeated file fields", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [
        ...fields(),
        filePart("primeiro.txt", Buffer.from("primeiro")),
        filePart("segundo.txt", Buffer.from("segundo")),
      ],
      cookie,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");

    await expectNothingPersisted();
  });

  it("rejects a request without a file", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(fields(), cookie);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "O arquivo é obrigatório." },
    });
    await expectNothingPersisted();
  });

  it("rejects a non-multipart request", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await getApp().inject({
      method: "POST",
      url: "/documents",
      headers: { cookie, "content-type": "application/json" },
      payload: { title: "x" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 502 and creates no record when the storage fails", async () => {
    const cookie = await loginAndGetCookie(getApp());
    storageFake.failures.put = true;

    const response = await upload(
      [...fields(), filePart("a.txt", Buffer.from("texto"))],
      cookie,
    );

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("STORAGE_ERROR");
    await expectNothingPersisted();
  });

  it("sanitizes the original file name", async () => {
    const cookie = await loginAndGetCookie(getApp());

    const response = await upload(
      [...fields(), filePart("../../segredo/notas.txt", Buffer.from("texto"))],
      cookie,
    );

    expect(response.statusCode).toBe(201);
    expect(response.json().originalName).toBe("notas.txt");
  });
});
