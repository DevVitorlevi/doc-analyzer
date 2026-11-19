/// <reference types="@testing-library/jest-dom" />

import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { NetworkReadyState } from "msw/experimental";
import { server } from "./server";

beforeAll(() => {
  if (server.readyState === NetworkReadyState.DISABLED) {
    server.listen({ onUnhandledFrame: "error" });
  }
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  if (server.readyState === NetworkReadyState.ENABLED) {
    server.close();
  }
});
