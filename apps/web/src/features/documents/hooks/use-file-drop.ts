import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

interface DragLikeEvent {
  dataTransfer: DataTransfer | null;
}

function hasFiles(event: DragLikeEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function usePreventWindowFileDrop() {
  useEffect(() => {
    function prevent(event: globalThis.DragEvent) {
      if (hasFiles(event)) {
        event.preventDefault();
      }
    }

    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);
}

interface UseFileDropOptions {
  disabled: boolean;
  onDropFiles: (files: File[]) => void;
}

export function useFileDrop({ disabled, onDropFiles }: UseFileDropOptions) {
  const depthRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);

  usePreventWindowFileDrop();

  const onDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();

      if (disabled) {
        return;
      }

      depthRef.current += 1;
      setIsDragOver(true);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    [disabled],
  );

  const onDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event) || disabled) {
        return;
      }

      depthRef.current = Math.max(0, depthRef.current - 1);

      if (depthRef.current === 0) {
        setIsDragOver(false);
      }
    },
    [disabled],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      depthRef.current = 0;
      setIsDragOver(false);

      if (disabled) {
        return;
      }

      onDropFiles(Array.from(event.dataTransfer.files));
    },
    [disabled, onDropFiles],
  );

  return {
    isDragOver: isDragOver && !disabled,
    dropZoneProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
