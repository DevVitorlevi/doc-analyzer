import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { AiAnalysisError } from "@/integrations/openai/ai-analysis-error";
import {
  ANALYSIS_TEMPERATURE,
  createOpenAIAnalyzer,
  createOpenAIClient,
  MAX_COMPLETION_TOKENS,
} from "@/integrations/openai/openai-analyzer";
import { SYSTEM_PROMPT } from "@/integrations/openai/analysis-prompt";

type FetchFn = NonNullable<ConstructorParameters<typeof OpenAI>[0]>["fetch"];

const settings = {
  OPENAI_API_KEY: "test-openai-api-key",
  OPENAI_MODEL: "gpt-4o-mini",
  OPENAI_TIMEOUT_MS: 60000,
};

const input = {
  instruction: "Resuma o documento",
  text: "Conteúdo do documento de teste.",
  truncated: false,
};

function makeClient(fetchImpl: FetchFn, timeout = 5000): OpenAI {
  return new OpenAI({
    apiKey: settings.OPENAI_API_KEY,
    maxRetries: 0,
    timeout,
    fetch: fetchImpl,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function completionBody(content: string | null): unknown {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        logprobs: null,
        message: { role: "assistant", content, refusal: null },
      },
    ],
  };
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the promise to reject");
}

describe("createOpenAIClient", () => {
  it("uses the configured timeout and disables automatic retries", () => {
    const client = createOpenAIClient(settings);

    expect(client.timeout).toBe(60000);
    expect(client.maxRetries).toBe(0);
  });
});

describe("createOpenAIAnalyzer", () => {
  it("returns the trimmed analysis from the model", async () => {
    const fetchImpl = vi.fn<NonNullable<FetchFn>>(async () =>
      jsonResponse(completionBody("  Resumo gerado.  ")),
    );
    const analyzer = createOpenAIAnalyzer(settings, makeClient(fetchImpl));

    await expect(analyzer.analyze(input)).resolves.toBe("Resumo gerado.");
  });

  it("sends the configured model, the system prompt and the user content", async () => {
    const fetchImpl = vi.fn<NonNullable<FetchFn>>(async () =>
      jsonResponse(completionBody("ok")),
    );
    const analyzer = createOpenAIAnalyzer(
      { ...settings, OPENAI_MODEL: "modelo-configurado" },
      makeClient(fetchImpl),
    );

    await analyzer.analyze({ ...input, truncated: true });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      temperature: number;
      max_completion_tokens: number;
      messages: { role: string; content: string }[];
    };

    expect(body.model).toBe("modelo-configurado");
    expect(body.temperature).toBe(ANALYSIS_TEMPERATURE);
    expect(body.max_completion_tokens).toBe(MAX_COMPLETION_TOKENS);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: SYSTEM_PROMPT,
    });
    expect(body.messages[1]?.role).toBe("user");
    expect(body.messages[1]?.content).toContain(input.instruction);
    expect(body.messages[1]?.content).toContain(input.text);
    expect(body.messages[1]?.content).toContain("apenas o início");
  });

  it("maps HTTP 429 to AI_RATE_LIMIT", async () => {
    const fetchImpl: NonNullable<FetchFn> = async () =>
      jsonResponse(
        { error: { message: "Rate limit", type: "rate_limit" } },
        429,
      );
    const analyzer = createOpenAIAnalyzer(settings, makeClient(fetchImpl));

    const error = await captureError(analyzer.analyze(input));

    expect(error).toBeInstanceOf(AiAnalysisError);
    expect((error as AiAnalysisError).code).toBe("AI_RATE_LIMIT");
  });

  it("maps a request that exceeds the timeout to AI_TIMEOUT", async () => {
    const hangingFetch: NonNullable<FetchFn> = (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted", "AbortError"));
        });
      });
    const analyzer = createOpenAIAnalyzer(
      settings,
      makeClient(hangingFetch, 50),
    );

    const error = await captureError(analyzer.analyze(input));

    expect(error).toBeInstanceOf(AiAnalysisError);
    expect((error as AiAnalysisError).code).toBe("AI_TIMEOUT");
  });

  it.each([
    [
      "server error (500)",
      async () => jsonResponse({ error: { message: "boom" } }, 500),
    ],
    [
      "invalid credentials (401)",
      async () => jsonResponse({ error: { message: "bad key" } }, 401),
    ],
    [
      "network failure",
      async (): Promise<Response> => {
        throw new TypeError("fetch failed");
      },
    ],
  ])("maps %s to AI_ERROR", async (_name, fetchImpl) => {
    const analyzer = createOpenAIAnalyzer(settings, makeClient(fetchImpl));

    const error = await captureError(analyzer.analyze(input));

    expect(error).toBeInstanceOf(AiAnalysisError);
    expect((error as AiAnalysisError).code).toBe("AI_ERROR");
  });

  it.each([null, "", "   "])(
    "maps an empty model response (%j) to AI_ERROR",
    async (content) => {
      const fetchImpl: NonNullable<FetchFn> = async () =>
        jsonResponse(completionBody(content));
      const analyzer = createOpenAIAnalyzer(settings, makeClient(fetchImpl));

      const error = await captureError(analyzer.analyze(input));

      expect(error).toBeInstanceOf(AiAnalysisError);
      expect((error as AiAnalysisError).code).toBe("AI_ERROR");
    },
  );

  it("keeps the original cause but exposes only a generic message", async () => {
    const fetchImpl: NonNullable<FetchFn> = async () =>
      jsonResponse({ error: { message: "detalhe interno sensível" } }, 500);
    const analyzer = createOpenAIAnalyzer(settings, makeClient(fetchImpl));

    const error = (await captureError(
      analyzer.analyze(input),
    )) as AiAnalysisError;

    expect(error.message).toBe("AI analysis failed: AI_ERROR");
    expect(error.message).not.toContain("sensível");
    expect(error.cause).toBeInstanceOf(OpenAI.APIError);
  });
});
