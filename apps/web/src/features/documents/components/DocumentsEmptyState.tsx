import { FileSearch } from "lucide-react";

export default function DocumentsEmptyState() {
  return (
    <div
      className={[
        "h-[75vh] flex flex-col items-center justify-center gap-(--space-10)",
        "rounded-(--radius-container) border border-dashed border-border",
        "px-6 py-16 text-center ",
      ].join(" ")}
    >
      <FileSearch
        aria-hidden="true"
        strokeWidth={2}
        className="size-14 shrink-0 text-[#B9BBC6]"
      />

      <div className="flex max-w-[400px] flex-col gap-2">
        <h2 className="text-[length:var(--font-size-empty-title)] font-medium leading-[var(--line-height-empty-title)] text-text-primary">
          Você ainda não tem documentos
        </h2>

        <p className="text-[length:var(--font-size-empty-description)] leading-[var(--line-height-empty-description)] text-text-secondary">
          Clique em “Adicionar documento” para enviar um arquivo PDF, DOCX ou
          TXT.
        </p>
      </div>
    </div>
  );
}
