import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function TestAlertDialog({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button">Excluir documento</button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não poderá ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("abre ao ativar o acionador", async () => {
    const user = userEvent.setup();

    render(<TestAlertDialog />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));

    expect(
      screen.getByRole("alertdialog", { name: "Confirmar exclusão" }),
    ).toBeInTheDocument();
  });

  it("associa título e descrição ao diálogo", async () => {
    const user = userEvent.setup();

    render(<TestAlertDialog />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));

    const dialog = screen.getByRole("alertdialog", {
      name: "Confirmar exclusão",
    });

    expect(dialog).toHaveAccessibleDescription(
      "Esta ação não poderá ser desfeita.",
    );
  });

  it("fecha ao cancelar", async () => {
    const user = userEvent.setup();

    render(<TestAlertDialog />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("executa a confirmação e fecha o diálogo", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<TestAlertDialog onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirm).toHaveBeenCalledOnce();

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("devolve o foco ao acionador após cancelar", async () => {
    const user = userEvent.setup();

    render(<TestAlertDialog />);

    const trigger = screen.getByRole("button", {
      name: "Excluir documento",
    });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
