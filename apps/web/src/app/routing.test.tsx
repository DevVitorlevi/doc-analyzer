import { act, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { appRoutes } from "./router";
import { createAppQueryClient } from "./query-client";
import { apiRequest, ApiError } from "@/lib/http";
import { server } from "@/test/server";
import { render } from "@testing-library/react";

const API_URL = "http://localhost:3333";

const userFixture = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Usuário de teste",
  email: "test@example.com",
  picture: null,
};

function renderAt(path: string) {
  const onSessionExpired = vi.fn();
  const queryClient = createAppQueryClient(onSessionExpired);
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [path],
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    ...view,
    router,
    queryClient,
    onSessionExpired,
  };
}

describe("roteamento e autenticação", () => {
  it("redireciona para login quando não existe sessão", async () => {
    server.use(
      http.get(`${API_URL}/me`, () =>
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

    const { router } = renderAt("/app/documentos");

    expect(
      await screen.findByRole("heading", { name: "Entrar" }),
    ).toBeInTheDocument();

    expect(router.state.location.pathname).toBe("/login");
  });

  it.each(["/", "/login"])(
    "redireciona de %s para documentos quando existe sessão",
    async (path) => {
      server.use(
        http.get(`${API_URL}/me`, () => HttpResponse.json(userFixture)),
      );

      const { router } = renderAt(path);

      expect(
        await screen.findByRole("heading", {
          name: "Documentos",
        }),
      ).toBeInTheDocument();

      expect(router.state.location.pathname).toBe("/app/documentos");
    },
  );

  it("não exibe documentos enquanto a sessão está carregando", async () => {
    let resolveRequest!: () => void;

    const requestGate = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.get(`${API_URL}/me`, async () => {
        await requestGate;
        return HttpResponse.json(userFixture);
      }),
    );

    const { router } = renderAt("/app/documentos");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando sessão...",
    );

    expect(
      screen.queryByRole("heading", { name: "Documentos" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveRequest();
    });

    expect(
      await screen.findByRole("heading", {
        name: "Documentos",
      }),
    ).toBeInTheDocument();

    expect(router.state.location.pathname).toBe("/app/documentos");
  });

  it("aciona o tratamento global quando uma chamada posterior retorna 401", async () => {
    const onSessionExpired = vi.fn();
    const queryClient = createAppQueryClient(onSessionExpired);

    server.use(
      http.get(`${API_URL}/documents`, () =>
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

    await expect(
      queryClient.fetchQuery({
        queryKey: ["documents"],
        queryFn: () => apiRequest("/documents"),
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });
  });
});
