/* pdf.js loader — ESM build bundled locally in vendor/.
   Resolves the worker relative to this module so it works from any page depth. */
import * as pdfjsLib from '../vendor/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../vendor/pdf.worker.mjs', import.meta.url).href;

export { pdfjsLib };

/* Extract text of every page. Returns { numPages, pages: string[] } */
export async function extractPdfText(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer.slice(0)); /* pdf.js needs a TypedArray */
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it) => it.str).join(' '));
    page.cleanup();
  }
  const numPages = pdf.numPages;
  await pdf.destroy();
  return { numPages, pages };
}

/* Render every page to a canvas at the given scale. Returns [{page, canvas}] */
export async function renderPdfPages(arrayBuffer, scale, onProgress) {
  const data = new Uint8Array(arrayBuffer.slice(0)); /* pdf.js needs a TypedArray */
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: scale || 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();
    out.push({ page: i, canvas });
    if (onProgress) onProgress(i, pdf.numPages);
  }
  const numPages = pdf.numPages;
  await pdf.destroy();
  return { numPages, pages: out };
}
