import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export interface OcrPage {
  pageNum: number;
  text: string;
}

export async function processPdfWithOcr(
  file: File,
  language: "eng" | "msa",
  onProgress: (step: string, page: number, total: number) => void
): Promise<OcrPage[]> {
  const Tesseract = await import("tesseract.js");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const totalPages = pdf.numPages;

  const pages: OcrPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress("ocr", pageNum, totalPages);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx as any, viewport }).promise;

    const result = await Tesseract.default.recognize(canvas, language);
    pages.push({ pageNum, text: result.data.text });

    // Release canvas memory after each page
    canvas.width = 0;
    canvas.height = 0;
  }

  return pages;
}
