import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

// ─── A4 landscape geometry (mm) ──────────────────────────
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 8;
const CONTENT_W = PAGE_W - MARGIN * 2; // 281
const CONTENT_H = PAGE_H - MARGIN * 2; // 194

/** Blocks shorter than this that contain a heading are treated as
 *  "keep with next" so a section title is never stranded at a page bottom. */
const HEADING_BLOCK_MAX_H = 40;
/** Minimum room that must remain after a heading block for its content. */
const KEEP_WITH_NEXT_MIN = 30;

/** Safari-safe canvas area ceiling (~16.7M px). Very tall sections get their
 *  capture scale reduced so the raster never exceeds this. */
const MAX_CANVAS_PIXELS = 16_000_000;
const BASE_SCALE = 2;

const captureScale = (el: HTMLElement): number => {
  const area = el.offsetWidth * el.offsetHeight;
  if (area <= 0) return BASE_SCALE;
  return Math.max(1, Math.min(BASE_SCALE, Math.sqrt(MAX_CANVAS_PIXELS / area)));
};

export interface PdfProgress {
  done: number;
  total: number;
}

const isVisible = (el: HTMLElement): boolean => {
  if (el.offsetHeight <= 1 || el.offsetWidth <= 1) return false;
  const cs = window.getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden";
};

const elementChildren = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.children).filter(
    (c): c is HTMLElement => c instanceof HTMLElement && isVisible(c),
  );

/**
 * Resolve a section into an ordered list of pagination blocks.
 * - Single-child wrappers (e.g. the SectionPage motion.div) are unwrapped.
 * - Any block taller than one page is expanded into its children so each
 *   card / chart / table can be paginated without being sliced mid-content.
 */
function collectBlocks(section: HTMLElement, mmPerPx: number): HTMLElement[] {
  let roots: HTMLElement[] = [section];
  // Unwrap single-child wrappers (up to a few levels deep).
  for (let i = 0; i < 4; i++) {
    if (roots.length === 1) {
      const kids = elementChildren(roots[0]);
      if (kids.length >= 1) {
        roots = kids;
        continue;
      }
    }
    break;
  }

  const out: HTMLElement[] = [];
  const expand = (el: HTMLElement, depth: number) => {
    const hMm = el.offsetHeight * mmPerPx;
    if (hMm > CONTENT_H && depth < 3) {
      const kids = elementChildren(el);
      if (kids.length >= 2) {
        for (const k of kids) expand(k, depth + 1);
        return;
      }
      if (kids.length === 1) {
        expand(kids[0], depth + 1);
        return;
      }
    }
    out.push(el);
  };
  for (const r of roots) expand(r, 0);
  return out;
}

const isHeadingBlock = (el: HTMLElement, mmPerPx: number): boolean =>
  el.offsetHeight * mmPerPx <= HEADING_BLOCK_MAX_H &&
  el.querySelector("h1, h2, h3") !== null &&
  el.querySelector("table, .recharts-wrapper, .surface-card") === null;

interface PageSlice {
  /** Top of the slice in section-local CSS pixels. */
  topPx: number;
  /** Bottom of the slice in section-local CSS pixels. */
  bottomPx: number;
}

/**
 * Assign a section's blocks to pages: greedy fill, never splitting a block,
 * keeping heading blocks together with the content that follows them.
 * Returns the pixel ranges (section-local) to slice out of the section canvas.
 */
function paginateSection(
  section: HTMLElement,
  blocks: HTMLElement[],
  mmPerPx: number,
): PageSlice[] {
  const secTop = section.getBoundingClientRect().top;
  const rects = blocks.map((b) => {
    const r = b.getBoundingClientRect();
    return { top: r.top - secTop, bottom: r.bottom - secTop };
  });

  const pages: PageSlice[] = [];
  let current: PageSlice | null = null;

  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const blockH = (r.bottom - r.top) * mmPerPx;
    const keepNext =
      isHeadingBlock(blocks[i], mmPerPx) && i < blocks.length - 1
        ? KEEP_WITH_NEXT_MIN
        : 0;

    if (current) {
      const usedH = (r.bottom - current.topPx) * mmPerPx;
      if (usedH + keepNext <= CONTENT_H) {
        current.bottomPx = r.bottom;
        continue;
      }
      pages.push(current);
      current = null;
    }
    // Start a new page with this block (oversized blocks get scaled later).
    current = { topPx: r.top, bottomPx: r.bottom };
    void blockH;
  }
  if (current) pages.push(current);
  return pages;
}

/** Slice a horizontal band out of the section canvas. */
function sliceCanvas(
  src: HTMLCanvasElement,
  topPx: number,
  bottomPx: number,
  scale: number,
): HTMLCanvasElement {
  const sy = Math.max(0, Math.floor(topPx * scale));
  const sh = Math.min(src.height - sy, Math.ceil((bottomPx - topPx) * scale));
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = Math.max(1, sh);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, sy, src.width, sh, 0, 0, src.width, sh);
  return out;
}

/**
 * Generate a multi-page A4 landscape PDF from the visible print root.
 * Each `.print-section` is captured once, then sliced into pages at block
 * boundaries so cards/charts/tables are never cut and every section starts
 * at the top of a fresh page.
 */
export async function generateReportPdf(
  root: HTMLElement,
  filename: string,
  onProgress?: (p: PdfProgress) => void,
): Promise<void> {
  // Mirror the @media print visibility rules while capturing (show the
  // chunked wide-table copies, hide their scrollable screen copies).
  root.classList.add("pdf-capture");
  // Let the layout settle before measuring.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const rootWidth = root.offsetWidth;
    const mmPerPx = CONTENT_W / rootWidth;

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > .print-section"),
    ).filter(isVisible);

    const total = sections.length;
    let done = 0;
    onProgress?.({ done, total });

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    let firstPage = true;

    for (const section of sections) {
      const blocks = collectBlocks(section, mmPerPx);
      if (blocks.length === 0) {
        done++;
        onProgress?.({ done, total });
        continue;
      }
      const pages = paginateSection(section, blocks, mmPerPx);

      const canvas = await html2canvas(section, {
        scale: captureScale(section),
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      // Canvas pixels per CSS pixel (html2canvas may round dimensions).
      const canvasScale = canvas.width / section.offsetWidth;

      for (const page of pages) {
        const slice = sliceCanvas(canvas, page.topPx, page.bottomPx, canvasScale);

        let drawW = Math.min(section.offsetWidth * mmPerPx, CONTENT_W);
        let drawH = (slice.height / slice.width) * drawW;
        if (drawH > CONTENT_H) {
          // Single oversized block: scale down to fit one page, keep intact.
          const k = CONTENT_H / drawH;
          drawH = CONTENT_H;
          drawW *= k;
        }

        if (firstPage) {
          firstPage = false;
        } else {
          pdf.addPage("a4", "landscape");
        }
        const x = MARGIN + (CONTENT_W - drawW) / 2;
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.92),
          "JPEG",
          x,
          MARGIN,
          drawW,
          drawH,
        );
      }

      done++;
      onProgress?.({ done, total });
      // Yield to the event loop so progress UI can repaint between sections.
      await new Promise((r) => setTimeout(r, 0));
    }

    pdf.save(filename);
  } finally {
    root.classList.remove("pdf-capture");
  }
}

/** Build a safe PDF filename from the firm name. */
export function reportPdfFilename(firmName?: string | null): string {
  const base = (firmName || "financial-report")
    .trim()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return `${base || "financial-report"}-report.pdf`;
}
