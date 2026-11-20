import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import DocumentGrid from "./components/DocumentGrid";
import DocumentsEmptyState from "./components/DocumentsEmptyState";
import SelectionBar from "./components/SelectionBar";
import { useDocuments } from "./queries";

const LOADING_SKELETON_COUNT = 4;
const LOADING_LABEL = "Carregando documentos...";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar seus documentos.";
const EMPTY_SELECTION: ReadonlySet<string> = new Set();

const skeletonItems = Array.from(
  { length: LOADING_SKELETON_COUNT },
  (_, index) => index,
);

function formatDocumentCount(count: number): string {
  return `${count} ${count === 1 ? "Documento" : "Documentos"}`;
}

export default function DocumentsPage() {
  const documents = useDocuments();
  const documentItems = documents.data;

  const [selectedIds, setSelectedIds] =
    useState<ReadonlySet<string>>(EMPTY_SELECTION);

  const selectedDocumentIds = useMemo(() => {
    if (documentItems === undefined) {
      return EMPTY_SELECTION;
    }

    const existingIds = new Set(documentItems.map((item) => item.id));

    return new Set(Array.from(selectedIds).filter((id) => existingIds.has(id)));
  }, [documentItems, selectedIds]);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-[var(--space-24)]">
      <h1 className="text-[length:var(--font-size-page-title)] font-semibold leading-[var(--line-height-page-title)] text-text-primary">
        Documentos
      </h1>

      <div
        aria-busy={documents.isPending}
        className={[
          "flex flex-col h-[85vh] gap-[var(--space-12)] p-[var(--space-24)]",
          "rounded-[var(--radius-container)] border border-border",
          "bg-surface-white",
        ].join(" ")}
      >
        {documents.isSuccess && (
          <div className="flex min-h-10 flex-wrap items-center justify-between gap-(--space-8)">
            {documents.data.length > 0 && (
              <p className="text-[length:var(--font-size-selection-counter)] font-medium leading-[var(--line-height-selection-counter)] tracking-[var(--letter-spacing-selection-counter)] text-text-primary">
                {formatDocumentCount(documents.data.length)}
              </p>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-(--space-8)">
              <SelectionBar selectedCount={selectedDocumentIds.size} />

              <Button className="pl-5 pr-6">
                <Plus aria-hidden="true" className="size-5 shrink-0" />
                Adicionar documento
              </Button>
            </div>
          </div>
        )}

        {documents.isPending && (
          <div role="status" className="flex flex-wrap gap-[var(--space-8)]">
            <span className="sr-only">{LOADING_LABEL}</span>

            {skeletonItems.map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className={[
                  "h-[var(--document-card-height)] w-[var(--document-card-width)]",
                  "rounded-[var(--radius-card)] bg-document-card",
                  "animate-pulse motion-reduce:animate-none",
                ].join(" ")}
              />
            ))}
          </div>
        )}

        {documents.isError && (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 px-6 py-16 text-center"
          >
            <p className="text-[length:var(--font-size-empty-description)] leading-[var(--line-height-empty-description)] text-text-primary">
              {LOAD_ERROR_MESSAGE}
            </p>

            <Button
              variant="secondary"
              onClick={() => void documents.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {documents.isSuccess && documents.data.length === 0 && (
          <DocumentsEmptyState />
        )}

        {documents.isSuccess && documents.data.length > 0 && (
          <DocumentGrid
            documents={documents.data}
            selectedIds={selectedDocumentIds}
            onToggle={handleToggle}
          />
        )}
      </div>
    </div>
  );
}
