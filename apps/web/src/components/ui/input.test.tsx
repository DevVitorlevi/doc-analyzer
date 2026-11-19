import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renderiza como campo de texto por padrão", () => {
    render(<Input aria-label="Nome" />);

    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveAttribute(
      "type",
      "text",
    );
  });

  it("permite informar outro tipo de campo", () => {
    render(<Input type="email" aria-label="E-mail" />);

    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAttribute(
      "type",
      "email",
    );
  });

  it("aceita placeholder", () => {
    render(<Input placeholder="Digite seu nome" />);

    expect(screen.getByPlaceholderText("Digite seu nome")).toBeInTheDocument();
  });

  it("permite digitar um valor", async () => {
    const user = userEvent.setup();

    render(<Input aria-label="Nome" />);

    const input = screen.getByRole("textbox", { name: "Nome" });

    await user.type(input, "Vitor");

    expect(input).toHaveValue("Vitor");
  });

  it("dispara onChange quando o valor muda", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input aria-label="Nome" onChange={onChange} />);

    await user.type(screen.getByRole("textbox", { name: "Nome" }), "A");

    expect(onChange).toHaveBeenCalled();
  });

  it("respeita o estado desabilitado", () => {
    render(<Input disabled aria-label="Nome" />);

    expect(screen.getByRole("textbox", { name: "Nome" })).toBeDisabled();
  });

  it("permite indicar estado inválido", () => {
    render(<Input aria-label="E-mail" aria-invalid="true" />);

    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("aceita classes adicionais", () => {
    render(<Input aria-label="Nome" className="custom-class" />);

    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveClass(
      "custom-class",
    );
  });
});
