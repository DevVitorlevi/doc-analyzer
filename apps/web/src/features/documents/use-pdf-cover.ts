import { useEffect, useState } from "react";

import { renderPdfCover } from "@/lib/pdf-cover";

interface Cover {
  file: File;
  url: string;
}

export function usePdfCover(file: File, enabled: boolean): string | null {
  const [cover, setCover] = useState<Cover | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();

    renderPdfCover(file, controller.signal)
      .then((url) => {
        if (!controller.signal.aborted) {
          setCover({ file, url });
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [file, enabled]);

  return enabled && cover !== null && cover.file === file ? cover.url : null;
}
