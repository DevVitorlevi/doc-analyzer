import { formatSize, mimeToExt, mimeToLabel } from "@/lib/format";

import { usePdfCover } from "../use-pdf-cover";

const METADATA_SEPARATOR = " · ";
const PDF_LABEL = "PDF";
const COVER_ALT = "Capa do documento";

interface FileTypeInfo {
  label: string;
  extension: string;
}

function getFileTypeInfo(file: File): FileTypeInfo {
  const label = mimeToLabel(file.type);

  if (label !== "") {
    return { label, extension: mimeToExt(file.type) };
  }

  const dotIndex = file.name.lastIndexOf(".");
  const extension =
    dotIndex === -1 ? "" : file.name.slice(dotIndex).toLowerCase();

  return { label: extension.slice(1).toUpperCase(), extension };
}

interface FilePreviewBlockProps {
  file: File;
}

export default function FilePreviewBlock({ file }: FilePreviewBlockProps) {
  const { label, extension } = getFileTypeInfo(file);
  const coverUrl = usePdfCover(file, label === PDF_LABEL);

  const metadata = [formatSize(file.size), extension]
    .filter((part) => part !== "")
    .join(METADATA_SEPARATOR);

  return (
    <div
      className={[
        "relative flex h-(--upload-dialog-preview-height) items-center",
        "justify-center rounded-(--radius-preview-content) bg-preview",
        "p-(--space-16)",
      ].join(" ")}
    >
      {coverUrl !== null ? (
        <img
          src={coverUrl}
          alt={COVER_ALT}
          className={[
            "h-(--thumbnail-height) w-auto max-w-full object-contain",
            "rounded-(--radius-thumbnail) border border-border bg-surface-white",
            "motion-safe:animate-fade-in",
          ].join(" ")}
        />
      ) : (
        <div
          className={[
            "flex h-(--thumbnail-height) w-(--thumbnail-width) shrink-0",
            "items-center justify-center rounded-(--radius-thumbnail)",
            "border border-border bg-surface-white",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className="text-[length:var(--font-size-secondary-description)] font-semibold leading-[var(--line-height-secondary-description)] text-text-secondary"
          >
            {label}
          </span>
        </div>
      )}

      <p className="absolute bottom-(--space-8) left-(--space-16) text-[length:var(--font-size-secondary-description)] leading-[var(--line-height-secondary-description)] text-text-secondary">
        {metadata}
      </p>
    </div>
  );
}
