import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/test/test-utils";

import SelectionBar from "./SelectionBar";

describe("SelectionBar", () => {
  it("não renderiza nada sem documentos selecionados", () => {
    const { container } = render(
      <SelectionBar selectedCount={0} onViewAnalysis={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("pluraliza o texto do chip", () => {
    const { rerender } = render(
      <SelectionBar selectedCount={1} onViewAnalysis={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "1 documento selecionado" }),
    ).toBeInTheDocument();

    rerender(<SelectionBar selectedCount={2} onViewAnalysis={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "2 documentos selecionados" }),
    ).toBeInTheDocument();
  });

  it("com 1 selecionado, o menu oferece excluir e visualizar análise", async () => {
    const user = userEvent.setup();

    render(<SelectionBar selectedCount={1} onViewAnalysis={vi.fn()} />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("menuitem", { name: "Excluir documentos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Visualizar análise" }),
    ).toBeInTheDocument();
  });

  it("com 2 ou mais selecionados, o menu oferece só excluir", async () => {
    const user = userEvent.setup();

    render(<SelectionBar selectedCount={3} onViewAnalysis={vi.fn()} />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("menuitem", { name: "Excluir documentos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Visualizar análise" }),
    ).not.toBeInTheDocument();
  });

  it("chama onViewAnalysis ao escolher Visualizar análise", async () => {
    const user = userEvent.setup();
    const onViewAnalysis = vi.fn();

    render(<SelectionBar selectedCount={1} onViewAnalysis={onViewAnalysis} />);

    await user.tab();
    await user.keyboard("{Enter}");
    await user.click(
      await screen.findByRole("menuitem", { name: "Visualizar análise" }),
    );

    expect(onViewAnalysis).toHaveBeenCalledTimes(1);
  });
});
