/**
 * Export engine shared by every table in Connect Affairs.
 *
 * Heavy dependencies (ExcelJS, pdf-lib) are dynamically imported so they are
 * code-split out of the main bundle and only fetched when a user exports.
 */

export interface ExportTable {
  /** File name without extension. */
  filename: string;
  /** Document heading used by PDF and Print. */
  title?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

const BRAND = { r: 0.067, g: 0.278, b: 0.608 }; // #11479B

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return new Date().toLocaleString();
}

/* ────────────────────────────── CSV ────────────────────────────── */

export function exportToCsv({ filename, headers, rows }: ExportTable): void {
  const escape = (value: string) =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map((cell) => escape(text(cell))).join(",")),
  ];

  // Leading BOM so Excel opens UTF-8 (₨, é, …) correctly.
  const blob = new Blob([`﻿${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  download(blob, `${filename}.csv`);
}

/* ───────────────────────────── Excel ───────────────────────────── */

export async function exportToExcel({
  filename,
  title,
  headers,
  rows,
}: ExportTable): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Connect Affairs";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title?.slice(0, 30) || "Export");
  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(42, Math.max(14, header.length + 6)),
  }));

  rows.forEach((row) => sheet.addRow(row.map(text)));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF11479B" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 20;

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`,
  );
}

/* ────────────────────────────── PDF ────────────────────────────── */

/**
 * The PDF standard fonts are WinAnsi-encoded and throw on characters they
 * cannot represent (₨, ﷼, non-Latin scripts). Map what we can, drop the rest.
 */
function toWinAnsi(value: string): string {
  return value
    .replace(/[₨₹]/g, "Rs")
    .replace(/﷼/g, "SAR")
    .replace(/€/g, "EUR")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\xFF]/g, "");
}

export async function exportToPdf({ filename, title, headers, rows }: ExportTable): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  doc.setTitle(title ?? filename);
  doc.setCreator("Connect Affairs");

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE = { width: 841.89, height: 595.28 }; // A4 landscape
  const margin = 32;
  const bodySize = 8;
  const headSize = 8.5;
  const rowHeight = 17;
  const usableWidth = PAGE.width - margin * 2;
  const colWidth = usableWidth / Math.max(1, headers.length);

  const brand = rgb(BRAND.r, BRAND.g, BRAND.b);
  const muted = rgb(0.45, 0.48, 0.55);
  const line = rgb(0.87, 0.89, 0.92);

  /** Truncate to fit a column, appending an ellipsis. */
  const fit = (value: string, font: typeof regular, size: number, max: number): string => {
    const safe = toWinAnsi(value);
    if (font.widthOfTextAtSize(safe, size) <= max) return safe;
    let out = safe;
    while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > max) {
      out = out.slice(0, -1);
    }
    return `${out}...`;
  };

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = 0;
  let pageNumber = 0;

  const startPage = (first: boolean) => {
    if (!first) page = doc.addPage([PAGE.width, PAGE.height]);
    pageNumber += 1;
    y = PAGE.height - margin;

    if (first) {
      page.drawText(fit(title ?? filename, bold, 14, usableWidth), {
        x: margin,
        y: y - 12,
        size: 14,
        font: bold,
        color: brand,
      });
      page.drawText(toWinAnsi(`Ashcon Engineering · generated ${timestamp()}`), {
        x: margin,
        y: y - 26,
        size: 8,
        font: regular,
        color: muted,
      });
      y -= 44;
    }

    // header band
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: usableWidth,
      height: rowHeight,
      color: brand,
    });
    headers.forEach((header, index) => {
      page.drawText(fit(header, bold, headSize, colWidth - 10), {
        x: margin + index * colWidth + 5,
        y: y - rowHeight + 5.5,
        size: headSize,
        font: bold,
        color: rgb(1, 1, 1),
      });
    });
    y -= rowHeight;
  };

  startPage(true);

  for (const row of rows) {
    if (y - rowHeight < margin + 18) startPage(false);

    row.forEach((cell, index) => {
      page.drawText(fit(text(cell), regular, bodySize, colWidth - 10), {
        x: margin + index * colWidth + 5,
        y: y - rowHeight + 5.5,
        size: bodySize,
        font: regular,
        color: rgb(0.13, 0.15, 0.2),
      });
    });

    page.drawLine({
      start: { x: margin, y: y - rowHeight },
      end: { x: margin + usableWidth, y: y - rowHeight },
      thickness: 0.5,
      color: line,
    });
    y -= rowHeight;
  }

  // footer page numbers
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    p.drawText(toWinAnsi(`Page ${index + 1} of ${pages.length}`), {
      x: PAGE.width - margin - 70,
      y: margin - 14,
      size: 7.5,
      font: regular,
      color: muted,
    });
  });

  const bytes = await doc.save();
  // Copy into a plain ArrayBuffer: pdf-lib returns Uint8Array<ArrayBufferLike>,
  // which lib.dom no longer accepts directly as a BlobPart.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  download(new Blob([buffer], { type: "application/pdf" }), `${filename}.pdf`);
}

/* ───────────────────────────── Print ───────────────────────────── */

export function printTable({ title, headers, rows }: ExportTable): void {
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;

  const heading = escapeHtml(title ?? "Export");
  const thead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(text(cell))}</td>`).join("")}</tr>`)
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${heading}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Inter,system-ui,sans-serif;color:#1f2937;margin:24px}
  h1{font-size:16px;color:#11479B;margin:0 0 2px}
  p.meta{font-size:11px;color:#6b7280;margin:0 0 16px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#11479B;color:#fff;text-align:left;padding:7px 8px;font-weight:600}
  td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even) td{background:#f8fafc}
  @page{size:A4 landscape;margin:12mm}
</style></head><body>
<h1>${heading}</h1>
<p class="meta">Ashcon Engineering &middot; generated ${escapeHtml(timestamp())}</p>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
</body></html>`);

  win.document.close();
  win.focus();
  win.onload = () => win.print();
}
