type CSVValue = string | number | undefined | null;

const csvCell = (value: CSVValue): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function toCSV(rows: CSVValue[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

// Downloads rows as a CSV file. A Blob URL keeps characters like '#' intact; a data: URI would cut the file off there.
export function downloadCSV(filename: string, rows: CSVValue[][]): void {
  const url = URL.createObjectURL(new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
