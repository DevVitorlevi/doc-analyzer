import { describe, expect, it } from "vitest";

describe("MSW", () => {
  it("rejeita requisições sem handler", async () => {
    await expect(
      fetch("http://localhost:3333/__rota_sem_handler__"),
    ).rejects.toThrow();
  });
});
