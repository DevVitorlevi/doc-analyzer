import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function TestDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button">Abrir diálogo</button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meu diálogo</DialogTitle>
        </DialogHeader>

        <DialogDescription>Conteúdo de teste do diálogo.</DialogDescription>

        <DialogClose asChild>
          <button type="button">Cancelar</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("abre ao ativar o acionador", async () => {
    const user = userEvent.setup();

    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));

    expect(
      screen.getByRole("dialog", { name: "Meu diálogo" }),
    ).toBeInTheDocument();
  });

  it("associa título e descrição ao diálogo", async () => {
    const user = userEvent.setup();

    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));

    const dialog = screen.getByRole("dialog", { name: "Meu diálogo" });

    expect(dialog).toHaveAccessibleDescription("Conteúdo de teste do diálogo.");
  });

  it("fecha ao pressionar Escape", async () => {
    const user = userEvent.setup();

    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("devolve o foco ao acionador após fechar", async () => {
    const user = userEvent.setup();

    render(<TestDialog />);

    const trigger = screen.getByRole("button", {
      name: "Abrir diálogo",
    });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("fecha pelo botão acessível de fechamento", async () => {
    const user = userEvent.setup();

    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir diálogo" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
