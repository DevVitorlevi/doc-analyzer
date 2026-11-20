import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { validateFile } from "@/lib/file-validation";

export function useFilePicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [chosenFile, setChosenFile] = useState<File | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const clearChosenFile = useCallback(() => {
    setChosenFile(null);
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0] ?? null;

      input.value = "";

      if (file === null) {
        return;
      }

      const error = validateFile(file);

      if (error !== null) {
        toast.error(getErrorMessage(error));
        return;
      }

      setChosenFile(file);
    },
    [],
  );

  return {
    inputRef,
    openPicker,
    handleInputChange,
    chosenFile,
    clearChosenFile,
  };
}
