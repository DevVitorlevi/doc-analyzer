import type { DocumentListItem } from "../types";

import DocumentCard from "./DocumentCard";

const GRID_LABEL = "Lista de documentos";

interface DocumentGridProps {
  documents: DocumentListItem[];
}

export default function DocumentGrid({ documents }: DocumentGridProps) {
  return (
    <ul
      aria-label={GRID_LABEL}
      className={[
        "grid min-h-0 flex-1 content-start gap-(--space-8) overflow-y-auto",
        "grid-cols-[repeat(auto-fill,var(--document-card-width))]",
      ].join(" ")}
    >
      {documents.map((item) => (
        <DocumentCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
