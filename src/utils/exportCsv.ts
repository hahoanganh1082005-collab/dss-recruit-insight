/**
 * UTF-8 BOM CSV Exporter so Vietnamese diacritics open cleanly in Excel & Google Sheets
 */
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = Array.isArray(val) ? val.join('; ') : String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ];

  // Prepend UTF-8 BOM (\uFEFF) for Vietnamese Excel compatibility
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

