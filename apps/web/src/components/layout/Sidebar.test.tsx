import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import Sidebar from "./Sidebar";

import type { User } from "@/features/auth/use-session";

const userFixture: User = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Usuário de Teste",
  email: "usuario@example.com",
  picture: null,
};

function renderSidebar(user: User = userFixture) {
  return render(
    <MemoryRouter initialEntries={["/app/documentos"]}>
      <Sidebar user={user} />
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
      ...userFixture,
      picture: "https://example.com/avatar.png",
    });

    const image = container.querySelector("img");

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("alt", userFixture.name);

    fireEvent.error(image!);

    expect(screen.getByText("UT")).toBeInTheDocument();
  });

  it("mantém o botão Sair desabilitado até a implementação do logout", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: "Sair" })).toBeDisabled();
  });
});
