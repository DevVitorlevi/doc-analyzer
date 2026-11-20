import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AppShell from "./AppShell";

const userFixture = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Usuário de Teste",
  email: "usuario@example.com",
  picture: null,
};

vi.mock("@/features/auth/use-session", () => ({
  useSession: () => ({
    data: userFixture,
  }),
}));

describe("AppShell", () => {
  it("exibe a Sidebar e o conteúdo da rota", () => {
    render(
      <MemoryRouter initialEntries={["/app/documentos"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/app/documentos" element={<h1>Documentos</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Escritório")).toBeInTheDocument();
    expect(screen.getByText("Advogados associados")).toBeInTheDocument();
    expect(screen.getByText("Usuário de Teste")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Documentos" }),
    ).toBeInTheDocument();
  });
});
