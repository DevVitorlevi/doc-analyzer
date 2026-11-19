import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function TestDropdown({ onSelect = vi.fn() }: { onSelect?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button">Abrir menu</button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onSelect}>Editar</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("abre ao ativar o acionador", async () => {
    const user = userEvent.setup();

    render(<TestDropdown />);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Editar" }),
    ).toBeInTheDocument();
  });

  it("executa a ação selecionada e fecha o menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<TestDropdown onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(onSelect).toHaveBeenCalledOnce();

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("fecha ao pressionar Escape", async () => {
    const user = userEvent.setup();

    render(<TestDropdown />);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("devolve o foco ao acionador após fechar", async () => {
    const user = userEvent.setup();

    render(<TestDropdown />);

    const trigger = screen.getByRole("button", { name: "Abrir menu" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("aplica estilo destrutivo ao item de exclusão", async () => {
    const user = userEvent.setup();

    render(<TestDropdown />);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(screen.getByRole("menuitem", { name: "Excluir" })).toHaveClass(
      "text-[var(--color-danger-action)]",
    );
  });

  it("permite navegação por teclado", async () => {
    const user = userEvent.setup();

    render(<TestDropdown />);

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("menuitem", { name: "Editar" })).toHaveFocus();
  });
});
