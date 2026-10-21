type CSVValue = string | number | undefined | null;

// Text starting with = + - or @ would run as a formula in Excel, so it's prefixed with ' to stay plain text.
// Numbers are left alone so negative amounts still read as numbers.
const csvCell = (value: CSVValue): string => {
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export function toCSV(rows: CSVValue[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

// Downloads rows as a CSV file. A Blob URL keeps characters like '#' intact; a data: URI would cut the file off there.
export function downloadCSV(filename: string, rows: CSVValue[][]): void {
  // The BOM tells Excel the file is UTF-8, so ₱, · and ñ don't come out garbled.
  const url = URL.createObjectURL(new Blob(['\uFEFF' + toCSV(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
