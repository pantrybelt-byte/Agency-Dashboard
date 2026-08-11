/**
 * Export tabular data as a downloadable CSV file.
 * Handles string escaping, array formatting, and timestamped filenames.
 */
export function exportToCSV<T extends Record<string, any>>(
  filenamePrefix: string,
  data: T[],
  columns?: { key: keyof T; label: string }[]
): void {
  if (!data || data.length === 0) return;

  const keys = columns
    ? columns.map((col) => col.key)
    : (Object.keys(data[0]) as (keyof T)[]);

  const headers = columns
    ? columns.map((col) => col.label)
    : keys.map((key) => String(key));

  const csvRows: string[] = [];

  // Add Header Row
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Add Data Rows
  data.forEach((row) => {
    const values = keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) {
        return '""';
      }
      if (typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
