import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { getErrorMessage, MULTIPLE_FILES_MESSAGE } from "@/lib/errors";
import { validateFile } from "@/features/documents/utils/file-validation";

export function useFilePicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [chosenFile, setChosenFile] = useState<File | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const clearChosenFile = useCallback(() => {
    setChosenFile(null);
  }, []);

  const selectFile = useCallback((file: File) => {
    const error = validateFile(file);

    if (error !== null) {
      toast.error(getErrorMessage(error));
      return;
    }

    setChosenFile(file);
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0] ?? null;

      input.value = "";

      if (file === null) {
        return;
      }

      selectFile(file);
    },
    [selectFile],
  );

  const handleDroppedFiles = useCallback(
    (files: readonly File[]) => {
      if (files.length > 1) {
        toast.error(MULTIPLE_FILES_MESSAGE);
        return;
      }

      const file = files[0];

      if (file === undefined) {
        return;
      }

      selectFile(file);
    },
    [selectFile],
  );

  return {
    inputRef,
    openPicker,
    handleInputChange,
    handleDroppedFiles,
    chosenFile,
    clearChosenFile,
  };
}
