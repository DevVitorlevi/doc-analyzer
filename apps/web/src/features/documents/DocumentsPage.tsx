import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FILE_INPUT_ACCEPT } from "@/lib/file-validation";

import AnalysisModal from "./components/AnalysisModal";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import DocumentGrid from "./components/DocumentGrid";
import DocumentsEmptyState from "./components/DocumentsEmptyState";
import SelectionBar from "./components/SelectionBar";
import UploadModal from "./components/UploadModal";
import { notifyDeleteReport } from "./delete-feedback";
import { useDocuments } from "./queries";
import { useDeleteDocuments } from "./use-delete-documents";
import { useFileDrop } from "./use-file-drop";
import { useFilePicker } from "./use-file-picker";

const LOADING_SKELETON_COUNT = 4;
const LOADING_LABEL = "Carregando documentos...";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar seus documentos.";
const FILE_INPUT_LABEL = "Selecionar arquivo";
const DOCUMENTS_AREA_LABEL = "Área de documentos";
const EMPTY_SELECTION: ReadonlySet<string> = new Set();
const NO_IDS: readonly string[] = [];

const skeletonItems = Array.from(
  { length: LOADING_SKELETON_COUNT },
  (_, index) => index,
);

function formatDocumentCount(count: number): string {
  return `${count} ${count === 1 ? "Documento" : "Documentos"}`;
}

export default function DocumentsPage() {
  const documents = useDocuments();
  const { deleteDocuments, isDeleting } = useDeleteDocuments();
  const documentItems = documents.data;
  const {
    inputRef,
    openPicker,
    handleInputChange,
    handleDroppedFiles,
    chosenFile,
    clearChosenFile,
  } = useFilePicker();
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<readonly string[]>(NO_IDS);

  const { isDragOver, dropZoneProps } = useFileDrop({
    disabled:
      !documents.isSuccess ||
      chosenFile !== null ||
      analysisId !== null ||
      isDeleteOpen,
    onDropFiles: handleDroppedFiles,
  });

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

  const handleViewAnalysis = useCallback(() => {
    const [onlyId] = Array.from(selectedDocumentIds);

    if (selectedDocumentIds.size === 1 && onlyId !== undefined) {
      setAnalysisId(onlyId);
    }
  }, [selectedDocumentIds]);

  const handleCloseAnalysis = useCallback(() => {
    setAnalysisId(null);
  }, []);

  function handleRequestDelete() {
    if (selectedDocumentIds.size > 0) {
      setIdsToDelete(Array.from(selectedDocumentIds));
      setIsDeleteOpen(true);
    }
  }

  async function handleConfirmDelete() {
    const report = await deleteDocuments(idsToDelete);

    if (report === null) {
      return;
    }

    setIsDeleteOpen(false);

    if (report.sessionExpired) {
      return;
    }

    setSelectedIds(new Set(report.failedIds));
    notifyDeleteReport(report);
  }

  return (
    <div className="flex flex-col gap-[var(--space-24)]">
      <h1 className="text-[length:var(--font-size-page-title)] font-semibold leading-[var(--line-height-page-title)] text-text-primary">
        Documentos
      </h1>

      <div
        role="region"
        aria-label={DOCUMENTS_AREA_LABEL}
        aria-busy={documents.isPending}
        data-drag-active={isDragOver}
        {...dropZoneProps}
        className={[
          "flex min-h-[60vh] flex-col gap-[var(--space-12)] p-[var(--space-16)]",
          "md:h-[85vh] lg:p-[var(--space-24)]",
          "rounded-[var(--radius-container)] border",
          "motion-safe:transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-surface-white",
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
              <SelectionBar
                selectedCount={selectedDocumentIds.size}
                onViewAnalysis={handleViewAnalysis}
                onDelete={handleRequestDelete}
              />

              <Button
                ref={addButtonRef}
                className="pl-5 pr-6 font-light cursor-pointer"
                onClick={openPicker}
              >
                <Plus aria-hidden="true" className="size-5 shrink-0" />
                Adicionar documento
              </Button>

              <input
                ref={inputRef}
                type="file"
                accept={FILE_INPUT_ACCEPT}
                aria-label={FILE_INPUT_LABEL}
                className="hidden"
                tabIndex={-1}
                onChange={handleInputChange}
              />
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
          <DocumentsEmptyState isDragActive={isDragOver} />
        )}

        {documents.isSuccess && documents.data.length > 0 && (
          <DocumentGrid
            documents={documents.data}
            selectedIds={selectedDocumentIds}
            onToggle={handleToggle}
          />
        )}
      </div>

      <UploadModal
        file={chosenFile}
        onClose={clearChosenFile}
        returnFocusRef={addButtonRef}
      />

      <AnalysisModal documentId={analysisId} onClose={handleCloseAnalysis} />

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        count={idsToDelete.length}
        isDeleting={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onOpenChange={setIsDeleteOpen}
      />
    </div>
  );
}
