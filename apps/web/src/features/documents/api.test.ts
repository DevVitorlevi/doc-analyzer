import { afterEach, describe, expect, it, vi } from "vitest";

import { API_BASE_URL } from "@/lib/http";

import {
  deleteDocument,
  getDocument,
  listDocuments,
  retryDocument,
  uploadDocument,
} from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastFetchCall(spy: ReturnType<typeof mockFetch>) {
  const [url, init] = spy.mock.calls[spy.mock.calls.length - 1] as [
    string,
    RequestInit,
  ];

  return { url, init };
}

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api de documentos", () => {
  it("lista os documentos com GET /documents", async () => {
    const spy = mockFetch(jsonResponse([]));

    await expect(listDocuments()).resolves.toEqual([]);

    const { url, init } = lastFetchCall(spy);

    expect(url).toBe(`${API_BASE_URL}/documents`);
    expect(init.credentials).toBe("include");
  });

  it("busca o detalhe com GET /documents/:id", async () => {
    const spy = mockFetch(jsonResponse({ id: "abc" }));

    await getDocument("abc");

    expect(lastFetchCall(spy).url).toBe(`${API_BASE_URL}/documents/abc`);
  });

  it("envia o upload com campos antes do arquivo e sem Content-Type manual", async () => {
    const spy = mockFetch(jsonResponse({ id: "abc" }, 201));
    const file = new File(["conteúdo"], "documento.txt", {
      type: "text/plain",
    });

    await uploadDocument({
      title: "Meu documento",
      instruction: "Resuma o texto.",
      file,
    });

    const { url, init } = lastFetchCall(spy);
    const body = init.body as FormData;

    expect(url).toBe(`${API_BASE_URL}/documents`);
    expect(init.method).toBe("POST");
    expect(init.headers).toBeUndefined();
    expect(body).toBeInstanceOf(FormData);
    expect(Array.from(body.keys())).toEqual(["title", "instruction", "file"]);
    expect(body.get("title")).toBe("Meu documento");
    expect(body.get("instruction")).toBe("Resuma o texto.");
  });

  it("reprocessa com POST /documents/:id/retry", async () => {
    const spy = mockFetch(jsonResponse({ id: "abc" }));

    await retryDocument("abc");

    const { url, init } = lastFetchCall(spy);

    expect(url).toBe(`${API_BASE_URL}/documents/abc/retry`);
    expect(init.method).toBe("POST");
  });

  it("exclui com DELETE /documents/:id e trata 204 sem corpo", async () => {
    const spy = mockFetch(new Response(null, { status: 204 }));

    await expect(deleteDocument("abc")).resolves.toBeUndefined();

    const { url, init } = lastFetchCall(spy);

    expect(url).toBe(`${API_BASE_URL}/documents/abc`);
    expect(init.method).toBe("DELETE");
  });
});
