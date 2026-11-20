import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const COVER_RENDER_HEIGHT_PX = 192;
const COVER_IMAGE_TYPE = "image/png";

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const { result } = reader;

      if (result === null || typeof result === "string") {
        reject(new Error("Leitura do arquivo inválida."));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    };

    reader.readAsArrayBuffer(file);
  });
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Renderização cancelada.", "AbortError");
  }
}

export async function renderPdfCover(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");

  GlobalWorkerOptions.workerSrc = workerSrc;

  const data = new Uint8Array(await readAsArrayBuffer(file));

  assertNotAborted(signal);

  const loadingTask = getDocument({ data, isEvalSupported: false });

  try {
    const pdf = await loadingTask.promise;

    assertNotAborted(signal);

    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: COVER_RENDER_HEIGHT_PX / baseViewport.height,
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const canvasContext = canvas.getContext("2d");

    if (canvasContext === null) {
      throw new Error("Canvas indisponível.");
    }

    await page.render({ canvas, canvasContext, viewport }).promise;

    assertNotAborted(signal);

    return canvas.toDataURL(COVER_IMAGE_TYPE);
  } finally {
    await loadingTask.destroy();
  }
}
