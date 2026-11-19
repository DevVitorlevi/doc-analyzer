import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { ApiError, apiRequest } from "./http";

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
});
