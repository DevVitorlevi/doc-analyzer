import { http, HttpResponse } from "msw";

const API_URL = "http://localhost:3333";

const documentFixture = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Documento de teste",
  instruction: "Analise este documento.",
  status: "COMPLETED",
  analysis: "Análise de teste.",
  truncated: false,
  errorCode: null,
  errorMessage: null,
  originalName: "documento.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  createdAt: "2026-11-19T12:00:00.000Z",
};

export const handlers = [
  http.get(`${API_URL}/health`, () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${API_URL}/me`, () => {
    return HttpResponse.json({
      id: "00000000-0000-4000-8000-000000000002",
      name: "Usuário de teste",
      email: "test@example.com",
      picture: null,
    });
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_URL}/documents`, () => {
    return HttpResponse.json(documentFixture, { status: 201 });
  }),

  http.get(`${API_URL}/documents`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${API_URL}/documents/:id/retry`, () => {
    return HttpResponse.json(documentFixture);
  }),

  http.get(`${API_URL}/documents/:id`, () => {
    return HttpResponse.json({
      ...documentFixture,
      fileUrl: "https://example.com/documento.pdf",
    });
  }),

  http.delete(`${API_URL}/documents/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
