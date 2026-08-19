/**
 * CSV export hardened for the tools these files actually land in — chiefly
 * Excel, since exports go to partner agencies and grant reviewers by email.
 */

/** Excel treats a leading one of these as the start of a formula. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/** Excel only detects UTF-8 reliably when the file starts with a BOM. */
const UTF8_BOM = '﻿';

/**
 * Quote a value for CSV, neutralising spreadsheet formula injection.
 *
 * A cell beginning `=`, `+`, `-` or `@` is evaluated as a formula by Excel and
 * LibreOffice even inside quotes, which turns a community name or an item
 * label into executable content. Prefixing a single quote makes the cell
 * literal; the leading quote is not displayed by Excel.
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '""';

  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const neutralised = FORMULA_TRIGGERS.some((trigger) => raw.startsWith(trigger)) ? `'${raw}` : raw;

  return `"${neutralised.replace(/"/g, '""')}"`;
}

/** Build the CSV body. Exported separately so it can be tested without the DOM. */
export function buildCSV<T extends object>(
  data: T[],
  columns?: { key: keyof T; label: string }[],
): string {
  if (!data || data.length === 0) return '';

  const keys = columns ? columns.map((column) => column.key) : (Object.keys(data[0]) as (keyof T)[]);
  const headers = columns ? columns.map((column) => column.label) : keys.map((key) => String(key));

  const rows = [
    headers.map(escapeCSVValue).join(','),
    ...data.map((row) => keys.map((key) => escapeCSVValue(row[key])).join(',')),
  ];

  // RFC 4180 specifies CRLF. Excel on Windows misreads bare LF in some locales.
  return rows.join('\r\n');
}

/**
 * Export tabular data as a downloadable CSV file with a timestamped filename.
 */
export function exportToCSV<T extends object>(
  filenamePrefix: string,
  data: T[],
  columns?: { key: keyof T; label: string }[],
): void {
  const csv = buildCSV(data, columns);
  if (!csv) return;

  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a module bundle, writing its provenance lines above the table.
 *
 * `buildModuleExport` has always produced provenance — agency, scope, period,
 * and the warning that fires when a figure is modelled rather than measured —
 * and the exporter dropped it on the floor. A file that leaves the building
 * without saying what it covers is the one that gets quoted out of context.
 *
 * The lines go in as single-column rows followed by a blank row. Excel and
 * LibreOffice both show them as a header block and still parse the table
 * beneath, which is the convention grant reviewers already expect.
 */
export function exportBundleToCSV(bundle: {
  filename: string;
  rows: Record<string, string | number>[];
  provenance: string[];
}): void {
  const body = buildCSV(bundle.rows);
  if (!body) return;

  const header = bundle.provenance.map((line) => escapeCSVValue(line)).join('\r\n');
  const csv = header ? `${header}\r\n\r\n${body}` : body;

  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${bundle.filename}_${dateStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
