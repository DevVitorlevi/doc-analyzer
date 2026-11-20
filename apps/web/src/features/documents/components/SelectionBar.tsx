import { Eye, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SINGLE_SELECTION_COUNT = 1;

function formatSelectionLabel(count: number): string {
  return count === SINGLE_SELECTION_COUNT
    ? `${count} documento selecionado`
    : `${count} documentos selecionados`;
}

interface SelectionBarProps {
  selectedCount: number;
}

export default function SelectionBar({ selectedCount }: SelectionBarProps) {
  if (selectedCount < 1) {
    return null;
  }

  const canViewAnalysis = selectedCount === SINGLE_SELECTION_COUNT;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="px-6">
          {formatSelectionLabel(selectedCount)}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive">
          <Trash2
            aria-hidden="true"
            className="size-4 shrink-0"
            strokeWidth={2}
          />
          Excluir documentos
        </DropdownMenuItem>

        {canViewAnalysis && (
          <DropdownMenuItem className="text-[var(--color-primary-action)]">
            <Eye
              aria-hidden="true"
              className="size-4 shrink-0"
              strokeWidth={2}
            />
            Visualizar análise
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
