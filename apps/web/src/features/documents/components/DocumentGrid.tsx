import type { DocumentListItem } from "../types";

import DocumentCard from "./DocumentCard";

const GRID_LABEL = "Lista de documentos";

interface DocumentGridProps {
  documents: DocumentListItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export default function DocumentGrid({
  documents,
  selectedIds,
  onToggle,
}: DocumentGridProps) {
  return (
    <ul
      aria-label={GRID_LABEL}
      className={[
        "grid min-h-0 flex-1 content-start gap-(--space-12) overflow-y-auto",
        "sm:gap-(--space-24)",
        "grid-cols-[repeat(auto-fill,var(--document-card-width))]",
      ].join(" ")}
    >
      {documents.map((item) => (
        <DocumentCard
          key={item.id}
          item={item}
          selected={selectedIds.has(item.id)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}
