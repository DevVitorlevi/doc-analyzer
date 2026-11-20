import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import Sidebar from "./Sidebar";

import type { User } from "@/features/auth/use-session";

const userFixture: User = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Usuário de Teste",
  email: "usuario@example.com",
  picture: null,
};

interface RenderSidebarOptions {
  user?: User;
  onLogout?: () => void;
  isLoggingOut?: boolean;
}

function renderSidebar({
  user = userFixture,
  onLogout = vi.fn(),
  isLoggingOut = false,
}: RenderSidebarOptions = {}) {
  return render(
    <MemoryRouter initialEntries={["/app/documentos"]}>
      <Sidebar user={user} onLogout={onLogout} isLoggingOut={isLoggingOut} />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("exibe a identificação do escritório e a navegação", () => {
    renderSidebar();

    expect(screen.getByText("Escritório")).toBeInTheDocument();
    expect(screen.getByText("Advogados associados")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Documentos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("exibe os dados do usuário recebidos por propriedade", () => {
    renderSidebar();

    expect(screen.getByText("Usuário de Teste")).toBeInTheDocument();
    expect(screen.getByText("usuario@example.com")).toBeInTheDocument();
  });

  it("exibe as iniciais quando o usuário não possui foto", () => {
    renderSidebar();

    expect(screen.getByText("UT")).toBeInTheDocument();
  });

  it("exibe as iniciais quando a imagem falha ao carregar", () => {
    const { container } = renderSidebar({
      user: { ...userFixture, picture: "https://example.com/avatar.png" },
    });

    const image = container.querySelector("img");

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("alt", userFixture.name);

    fireEvent.error(image!);

    expect(screen.getByText("UT")).toBeInTheDocument();
  });

  it("aciona o logout ao clicar em Sair", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    renderSidebar({ onLogout });

    const button = screen.getByRole("button", { name: "Sair" });

    expect(button).toBeEnabled();

    await user.click(button);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão Sair e não aciona o logout durante o envio", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    renderSidebar({ onLogout, isLoggingOut: true });

    const button = screen.getByRole("button", { name: "Sair" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await user.click(button);

    expect(onLogout).not.toHaveBeenCalled();
  });
});
