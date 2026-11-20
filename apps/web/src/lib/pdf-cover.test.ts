import { getDocument } from "pdfjs-dist";
import { describe, expect, it, vi } from "vitest";

import { renderPdfCover } from "./pdf-cover";

const COVER_DATA_URL = "data:image/png;base64,AAAA";

function makeFile(): File {
  return new File(["x"], "contrato.pdf", { type: "application/pdf" });
}

function mockLoadingTask(renderPage: () => Promise<void>) {
  const destroy = vi.fn(() => Promise.resolve());
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 140 * scale,
    }),
    render: vi.fn(() => ({ promise: renderPage() })),
  };
  const pdf = { getPage: vi.fn(() => Promise.resolve(page)) };

  vi.mocked(getDocument).mockImplementationOnce(
    () =>
      ({
        promise: Promise.resolve(pdf),
        destroy,
      }) as unknown as ReturnType<typeof getDocument>,
  );

  return destroy;
}

describe("renderPdfCover", () => {
  it("devolve a imagem da primeira página e libera o documento", async () => {
    const destroy = mockLoadingTask(() => Promise.resolve());
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => ({}) as unknown as RenderingContext);
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue(COVER_DATA_URL);

    try {
      await expect(renderPdfCover(makeFile())).resolves.toBe(COVER_DATA_URL);
      expect(destroy).toHaveBeenCalledTimes(1);
    } finally {
      getContext.mockRestore();
      toDataURL.mockRestore();
    }
  });

  it("libera o documento e repassa o erro quando a renderização falha", async () => {
    const destroy = mockLoadingTask(() => Promise.reject(new Error("falha")));
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => ({}) as unknown as RenderingContext);

    try {
      await expect(renderPdfCover(makeFile())).rejects.toThrow("falha");
      expect(destroy).toHaveBeenCalledTimes(1);
    } finally {
      getContext.mockRestore();
    }
  });
});
