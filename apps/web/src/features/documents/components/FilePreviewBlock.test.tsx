import { getDocument } from "pdfjs-dist";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "@/test/test-utils";

import FilePreviewBlock from './FilePreviewBlock';

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const COVER_DATA_URL = "data:image/png;base64,AAAA";
const COVER_ALT = "Capa do documento";

function makeFile(name: string, type: string, size = 34816): File {
  const file = new File(["x"], name, { type });

  Object.defineProperty(file, "size", { value: size });

  return file;
}

function mockPdfWithCover() {
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 140 * scale,
    }),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
  const pdf = { getPage: vi.fn(() => Promise.resolve(page)) };

  vi.mocked(getDocument).mockImplementationOnce(
    () =>
      ({
        promise: Promise.resolve(pdf),
        destroy: vi.fn(() => Promise.resolve()),
      }) as unknown as ReturnType<typeof getDocument>,
  );
}

function stubCanvas() {
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ({}) as unknown as RenderingContext);
  const toDataURL = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue(COVER_DATA_URL);

  return () => {
    getContext.mockRestore();
    toDataURL.mockRestore();
  };
}

describe("FilePreviewBlock", () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockClear();
  });

  it("exibe tipo e tamanho · extensão para DOCX e TXT sem tentar ler capa", () => {
    const { rerender } = render(
      <FilePreviewBlock file={makeFile("parecer.docx", DOCX_MIME, 2_936_012)} />,
    );

    expect(screen.getByText("DOCX")).toBeInTheDocument();
    expect(screen.getByText("2,8 MB · .docx")).toBeInTheDocument();

    rerender(
      <FilePreviewBlock file={makeFile("notas.txt", "text/plain", 1024)} />,
    );

    expect(screen.getByText("TXT")).toBeInTheDocument();
    expect(screen.getByText("1 KB · .txt")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(getDocument).not.toHaveBeenCalled();
  });

  it("mantém o ícone de tipo quando a capa do PDF não pode ser lida", async () => {
    render(
      <FilePreviewBlock file={makeFile("contrato.pdf", "application/pdf")} />,
    );

    await waitFor(() => expect(getDocument).toHaveBeenCalledTimes(1));

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("34 KB · .pdf")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("exibe a capa da primeira página quando o PDF é lido", async () => {
    mockPdfWithCover();
    const restoreCanvas = stubCanvas();

    try {
      render(
        <FilePreviewBlock file={makeFile("contrato.pdf", "application/pdf")} />,
      );

      const cover = await screen.findByRole("img", { name: COVER_ALT });

      expect(cover).toHaveAttribute("src", COVER_DATA_URL);
      expect(screen.queryByText("PDF")).not.toBeInTheDocument();
      expect(screen.getByText("34 KB · .pdf")).toBeInTheDocument();
    } finally {
      restoreCanvas();
    }
  });
});
