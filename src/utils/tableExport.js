import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function buildMatrix(columns, rows) {
  const headers = columns.map((col) => col.label);
  const body = rows.map((row) =>
    columns.map((col) => {
      const value = col.getValue(row);
      if (value == null || value === '') return '—';
      return value;
    }),
  );
  return { headers, body };
}

export function exportToExcel({ filename, sheetName = 'Sheet1', columns, rows }) {
  const { headers, body } = buildMatrix(columns, rows);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${filename || 'export'}_${stamp()}.xlsx`);
}

export function exportToPdf({ title, filename, columns, rows }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title || 'Export', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 40, 52);
  doc.setTextColor(0);

  const { headers, body } = buildMatrix(columns, rows);
  autoTable(doc, {
    startY: 64,
    head: [headers],
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  doc.save(`${filename || 'export'}_${stamp()}.pdf`);
}

export function printTable({ title, columns, rows }) {
  const { headers, body } = buildMatrix(columns, rows);
  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  const thead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const tbody = body
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title || 'Print')}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { margin: 0 0 16px; color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: #111; color: #fff; }
    tr:nth-child(even) td { background: #f7f7f7; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title || 'Print')}</h1>
  <p>Generated ${escapeHtml(new Date().toLocaleString('en-IN'))}</p>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups to print.');
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
