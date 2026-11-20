import { Check } from "lucide-react";
import { useId, type KeyboardEvent } from "react";

import { formatDate, formatSize, mimeToExt, mimeToLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { DocumentListItem, DocumentStatus } from "../types";

const METADATA_SEPARATOR = " · ";
const STATUS_LABEL_PROCESSING = "Processando";
const STATUS_LABEL_FAILED = "Falhou";

interface StatusBadge {
  label: string;
  className: string;
}

function getStatusBadge(status: DocumentStatus): StatusBadge | null {
  switch (status) {
    case "PROCESSING":
      return {
        label: STATUS_LABEL_PROCESSING,
        className: "border-border text-text-secondary",
      };
    case "FAILED":
      return {
        label: STATUS_LABEL_FAILED,
        className:
          "border-(--color-danger-action) text-(color:--color-danger-action)",
      };
    case "COMPLETED":
      return null;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

interface DocumentCardProps {
  item: DocumentListItem;
  selected: boolean;
  onToggle: (id: string) => void;
}

export default function DocumentCard({
  item,
  selected,
  onToggle,
}: DocumentCardProps) {
  const titleId = useId();
  const statusBadge = getStatusBadge(item.status);

  const metadata = [formatSize(item.sizeBytes), mimeToExt(item.mimeType)]
    .filter((part) => part !== "")
    .join(METADATA_SEPARATOR);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(item.id);
    }
  }

  return (
    <li>
      <div
        role="checkbox"
        aria-checked={selected}
        aria-labelledby={titleId}
        tabIndex={0}
        onClick={() => onToggle(item.id)}
        onKeyDown={handleKeyDown}
        className={cn(
          [
            "group relative flex h-(--document-card-height) w-(--document-card-width)",
            "cursor-pointer flex-col gap-(--space-8) overflow-hidden",
            "rounded-(--radius-card) border px-(--space-6) py-(--space-4)",
            "text-center transition-colors",
            "duration-(--interaction-transition-duration) motion-reduce:transition-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-[var(--color-primary-action)]",
          ],
          selected
            ? "border-primary bg-selection"
            : "border-border bg-document-card hover:bg-(--color-card-hover)",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            [
              "absolute left-(--space-6) top-(--space-6) flex size-(--icon-size-sm)",
              "items-center justify-center rounded-(--radius-thumbnail) border",
              "transition-opacity duration-(--interaction-transition-duration)",
              "motion-reduce:transition-none",
            ],
            selected
              ? "border-(--color-primary-action) bg-(--color-primary-action) text-white opacity-100"
              : "border-border bg-surface-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          {selected && <Check className="size-3" strokeWidth={2} />}
        </span>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div
            aria-hidden="true"
            className={[
              "flex h-(--document-icon-height) w-(--document-icon-width)",
              "items-center justify-center rounded-(--radius-thumbnail)",
              "border border-border bg-surface-white",
            ].join(" ")}
          >
            <span className="text-[length:var(--font-size-secondary-description)] font-semibold leading-[var(--line-height-secondary-description)] text-text-secondary">
              {mimeToLabel(item.mimeType)}
            </span>
          </div>

          {statusBadge !== null && (
            <span
              className={[
                "absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap",
                "rounded-full border bg-surface-white px-2 font-medium",
                "text-[length:var(--font-size-secondary-description)]",
                "leading-[var(--line-height-secondary-description)]",
                statusBadge.className,
              ].join(" ")}
            >
              {statusBadge.label}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <p
            id={titleId}
            title={item.title}
            className="truncate text-[length:var(--font-size-document-name)] font-medium leading-[var(--line-height-document-name)] text-text-primary"
          >
            {item.title}
          </p>

          <p className="text-[length:var(--font-size-secondary-description)] leading-[var(--line-height-secondary-description)] text-text-secondary">
            {formatDate(item.createdAt)}
          </p>

          <p className="text-[length:var(--font-size-secondary-description)] leading-[var(--line-height-secondary-description)] text-text-secondary">
            {metadata}
          </p>
        </div>
      </div>
    </li>
  );
}
