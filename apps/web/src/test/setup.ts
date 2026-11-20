/// <reference types="@testing-library/jest-dom" />

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { NetworkReadyState } from "msw/experimental";
import { server } from "./server";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(() => ({
    promise: Promise.reject(
      new Error("PDF indisponível no ambiente de teste."),
    ),
    destroy: vi.fn(() => Promise.resolve()),
  })),
}));

beforeAll(() => {
  if (server.readyState === NetworkReadyState.DISABLED) {
    server.listen({ onUnhandledFrame: "error" });
  }
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  if (server.readyState === NetworkReadyState.ENABLED) {
    server.close();
  }
});
