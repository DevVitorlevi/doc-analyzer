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
  onViewAnalysis: () => void;
  onDelete: () => void;
}

export default function SelectionBar({
  selectedCount,
  onViewAnalysis,
  onDelete,
}: SelectionBarProps) {
  if (selectedCount < 1) {
    return null;
  }

  const canViewAnalysis = selectedCount === SINGLE_SELECTION_COUNT;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="">
        <Button variant="secondary" className="px-6 font-normal cursor-pointer">
          {formatSelectionLabel(selectedCount)}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="border border-[#D9D9E0]">
        <DropdownMenuItem
          variant="default"
          className="text-md"
          onSelect={onDelete}
        >
          <Trash2
            aria-hidden="true"
            className="size-6 shrink-0 text-error"
            strokeWidth={2}
          />
          Excluir documentos
        </DropdownMenuItem>

        {canViewAnalysis && (
          <DropdownMenuItem className="text-md" onSelect={onViewAnalysis}>
            <Eye
              aria-hidden="true"
              className="size-6 shrink-0 text-success"
              strokeWidth={2}
            />
            Visualizar análise
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
