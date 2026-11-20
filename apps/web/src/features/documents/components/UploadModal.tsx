import { useState, type RefObject } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import UploadForm from "./UploadForm";

const MODAL_TITLE = "Prévia do Documento";

interface UploadModalProps {
  file: File | null;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export default function UploadModal({
  file,
  onClose,
  returnFocusRef,
}: UploadModalProps) {
  const [displayedFile, setDisplayedFile] = useState<File | null>(file);

  if (file !== null && file !== displayedFile) {
    setDisplayedFile(file);
  }

  return (
    <Dialog
      open={file !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[length:var(--font-size-dialog-title)] font-medium leading-[var(--line-height-dialog-title)] text-text-primary">
            {MODAL_TITLE}
          </DialogTitle>
        </DialogHeader>

        {displayedFile !== null && <UploadForm file={displayedFile} />}
      </DialogContent>
    </Dialog>
  );
}
