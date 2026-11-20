import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { API_BASE_URL, ApiError, apiRequest } from "./http";

const GENERIC_MESSAGE = "Algo deu errado. Tente novamente.";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

function lastFetchCall(spy: ReturnType<typeof mockFetch>) {
  const [url, init] = spy.mock.calls[spy.mock.calls.length - 1] as [
    string,
    RequestInit,
  ];

  return { url, init };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("converte 401 sem sessão em ApiError UNAUTHORIZED", async () => {
    server.use(
      http.get("http://localhost:3333/me", () =>
        HttpResponse.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Autenticação necessária.",
            },
          },
          { status: 401 },
        ),
      ),
    );

    try {
      await apiRequest("/me");
      throw new Error("A requisição deveria ter falhado.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 401,
        code: "UNAUTHORIZED",
      });
    }
  });

  it("converte falha de rede em INTERNAL_ERROR sem expor detalhes técnicos", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch: internal network details"),
    );

    try {
      await apiRequest("/me");
      throw new Error("A requisição deveria ter falhado.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 0,
        code: "INTERNAL_ERROR",
        message: "Algo deu errado. Tente novamente.",
      });

      expect((error as Error).message).not.toContain(
        "internal network details",
      );
    }
  });

  it("envia sempre credentials: include e monta a URL a partir da base", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    await apiRequest("/me");
    await apiRequest("me", { method: "POST" });

    const calls = spy.mock.calls as [string, RequestInit][];

    expect(calls[0]?.[0]).toBe(`${API_BASE_URL}/me`);
    expect(calls[0]?.[1].credentials).toBe("include");
    expect(calls[1]?.[0]).toBe(`${API_BASE_URL}/me`);
    expect(calls[1]?.[1].credentials).toBe("include");
    expect(calls[1]?.[1].method).toBe("POST");
  });

  it("devolve o corpo JSON em respostas de sucesso", async () => {
    mockFetch(jsonResponse({ id: "abc" }));

    await expect(apiRequest<{ id: string }>("/me")).resolves.toEqual({
      id: "abc",
    });
  });

  it("trata 204 sem ler o corpo", async () => {
    const response = new Response(null, { status: 204 });
    const jsonSpy = vi.spyOn(response, "json");

    mockFetch(response);

    await expect(
      apiRequest("/auth/logout", { method: "POST" }),
    ).resolves.toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it("converte erro no formato { error: { code, message } } em ApiError", async () => {
    mockFetch(
      jsonResponse(
        { error: { code: "NOT_FOUND", message: "Documento inexistente." } },
        404,
      ),
    );

    const promise = apiRequest("/documents/abc");

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("converte corpo de erro fora do padrão em INTERNAL_ERROR mantendo o status", async () => {
    mockFetch(jsonResponse({ detail: "formato inesperado" }, 500));

    const promise = apiRequest("/documents");

    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 500,
      code: "INTERNAL_ERROR",
      message: GENERIC_MESSAGE,
    });
  });

  it("converte código de erro desconhecido em INTERNAL_ERROR", async () => {
    mockFetch(
      jsonResponse({ error: { code: "NOVO_CODIGO", message: "x" } }, 400),
    );

    await expect(apiRequest("/documents")).rejects.toMatchObject({
      status: 400,
      code: "INTERNAL_ERROR",
      message: GENERIC_MESSAGE,
    });
  });

  it("converte corpo de erro que não é JSON em INTERNAL_ERROR", async () => {
    mockFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const promise = apiRequest("/documents");

    await expect(promise).rejects.toMatchObject({
      status: 502,
      code: "INTERNAL_ERROR",
      message: GENERIC_MESSAGE,
    });
    await expect(promise).rejects.not.toHaveProperty(
      "message",
      "<html>Bad Gateway</html>",
    );
  });

  it("converte sucesso com corpo inválido em INTERNAL_ERROR", async () => {
    mockFetch(new Response("não é json", { status: 200 }));

    await expect(apiRequest("/me")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      message: GENERIC_MESSAGE,
    });
  });

  it("não define Content-Type manualmente quando o corpo é FormData", async () => {
    const spy = mockFetch(jsonResponse({ id: "abc" }, 201));
    const body = new FormData();

    body.append("title", "Documento");

    await apiRequest("/documents", { method: "POST", body });

    const { init } = lastFetchCall(spy);

    expect(init.body).toBe(body);
    expect(init.headers).toBeUndefined();
  });
});
