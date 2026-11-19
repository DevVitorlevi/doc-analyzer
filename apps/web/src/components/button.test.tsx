import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renderiza com o nome acessível informado", () => {
    render(<Button>Adicionar documento</Button>);

    expect(
      screen.getByRole("button", { name: "Adicionar documento" }),
    ).toBeInTheDocument();
  });

  it("usa type button por padrão", () => {
    render(<Button>Adicionar</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("permite informar type submit", () => {
    render(<Button type="submit">Salvar</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("executa a ação quando clicado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Salvar</Button>);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("não executa a ação quando desabilitado", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Salvar" });

    expect(button).toBeDisabled();

    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("aceita a variante secundária", () => {
    render(<Button variant="secondary">Cancelar</Button>);

    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();
  });

  it("aceita o tamanho de ícone", () => {
    render(
      <Button size="icon" aria-label="Fechar">
        X
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
});
