import { useRef, useState, type RefObject } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useUploadDocument } from "../queries";
import { notifyUploadError, notifyUploadResult } from "../upload-feedback";
import type { UploadFormValues } from "../utils/upload-form";

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
  const submittingRef = useRef(false);
  const upload = useUploadDocument();
  const isUploading = upload.isPending;

  if (file !== null && file !== displayedFile) {
    setDisplayedFile(file);
  }

  function handleSubmit(values: UploadFormValues) {
    if (displayedFile === null || submittingRef.current) {
      return;
    }

    submittingRef.current = true;

    upload.mutate(
      { ...values, file: displayedFile },
      {
        onSuccess: (document) => {
          notifyUploadResult(document);
          onClose();
        },
        onError: notifyUploadError,
        onSettled: () => {
          submittingRef.current = false;
        },
      },
    );
  }

  return (
    <Dialog
      open={file !== null}
      onOpenChange={(open) => {
        if (!open && !isUploading) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        closeDisabled={isUploading}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-(length:--font-size-dialog-title) font-medium leading-(--line-height-dialog-title) text-text-primary">
            {MODAL_TITLE}
          </DialogTitle>
        </DialogHeader>

        {displayedFile !== null && (
          <UploadForm
            file={displayedFile}
            isSubmitting={isUploading}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
