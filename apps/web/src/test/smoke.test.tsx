import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "./test-utils";

describe("infraestrutura de testes", () => {
  it("renderiza um componente React", () => {
    renderWithProviders(
      <main>
        <h1>Jus Digital</h1>
      </main>,
    );

    expect(
      screen.getByRole("heading", { name: "Jus Digital" }),
    ).toBeInTheDocument();
  });
});
