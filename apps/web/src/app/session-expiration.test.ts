import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { createSessionExpirationHandler } from "./session-expiration";

describe("tratamento de sessão expirada", () => {
  it("limpa o cache, redireciona para login e notifica o usuário", () => {
    const queryClient = new QueryClient();
    const navigateToLogin = vi.fn();
    const notify = vi.fn();

    queryClient.setQueryData(["documents"], [{ id: "document-1" }]);
    queryClient.setQueryData(["me"], {
      id: "user-1",
      name: "Usuário de teste",
    });

    const handleSessionExpired = createSessionExpirationHandler(
      () => queryClient.clear(),
      navigateToLogin,
      notify,
    );

    handleSessionExpired();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Sua sessão expirou. Entre novamente.");
  });

  it("não repete as ações quando a sessão expira várias vezes", () => {
    const queryClient = new QueryClient();
    const navigateToLogin = vi.fn();
    const notify = vi.fn();

    const handleSessionExpired = createSessionExpirationHandler(
      () => queryClient.clear(),
      navigateToLogin,
      notify,
    );

    handleSessionExpired();
    handleSessionExpired();

    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
