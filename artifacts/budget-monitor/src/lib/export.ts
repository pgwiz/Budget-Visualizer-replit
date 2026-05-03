import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'md' | 'docx';

export interface ExportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getRows(data: Record<string, any>[], columns: ExportColumn[]) {
  return data.map(row => columns.map(col => {
    const val = row[col.key];
    return val == null ? '' : String(val);
  }));
}

/* ── CSV ──────────────────────────────────────────────────── */
export function exportCsv(data: Record<string, any>[], columns: ExportColumn[], filename: string) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows   = getRows(data, columns).map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','));
  const csv    = [header, ...rows].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

/* ── XLSX ─────────────────────────────────────────────────── */
export function exportXlsx(data: Record<string, any>[], columns: ExportColumn[], filename: string, sheetName = 'Sheet1') {
  const header = columns.map(c => c.label);
  const rows   = getRows(data, columns);
  const ws     = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Column widths
  ws['!cols'] = columns.map(() => ({ wch: 22 }));

  // Style header row bold (xlsx doesn't support rich styles natively without add-ons, but set widths)
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/* ── JSON ─────────────────────────────────────────────────── */
export function exportJson(data: Record<string, any>[], columns: ExportColumn[], filename: string) {
  const shaped = data.map(row => {
    const out: Record<string, any> = {};
    columns.forEach(col => { out[col.label] = row[col.key] ?? null; });
    return out;
  });
  const blob = new Blob([JSON.stringify(shaped, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/* ── Markdown ─────────────────────────────────────────────── */
export function exportMd(data: Record<string, any>[], columns: ExportColumn[], filename: string, title?: string) {
  const colWidths = columns.map(col => {
    const max = Math.max(col.label.length, ...data.map(row => String(row[col.key] ?? '').length));
    return Math.min(max, 40);
  });

  const pad = (s: string, w: number, align: ExportColumn['align']) => {
    if (align === 'right')  return s.padStart(w);
    if (align === 'center') return s.padStart(Math.floor((w + s.length) / 2)).padEnd(w);
    return s.padEnd(w);
  };

  const header    = '| ' + columns.map((c, i) => pad(c.label, colWidths[i], c.align)).join(' | ') + ' |';
  const separator = '| ' + columns.map((c, i) => {
    const w = colWidths[i];
    if (c.align === 'right')  return '-'.repeat(w - 1) + ':';
    if (c.align === 'center') return ':' + '-'.repeat(w - 2) + ':';
    return '-'.repeat(w);
  }).join(' | ') + ' |';
  const rows = getRows(data, columns).map(r =>
    '| ' + r.map((v, i) => pad(v.slice(0, 40), colWidths[i], columns[i].align)).join(' | ') + ' |'
  );

  const lines = [
    title ? `# ${title}\n` : '',
    `_Exported: ${new Date().toLocaleString()}_\n`,
    header,
    separator,
    ...rows,
  ].filter(Boolean);

  downloadBlob(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' }), `${filename}.md`);
}

/* ── DOCX ─────────────────────────────────────────────────── */
export async function exportDocx(data: Record<string, any>[], columns: ExportColumn[], filename: string, title?: string) {
  const colCount = columns.length;
  const colPct   = Math.floor(100 / colCount);

  const headerCells = columns.map(col =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: col.label, bold: true, color: 'FFFFFF', size: 18 })], alignment: AlignmentType.CENTER })],
      shading: { fill: '1E3A5F' },
      width: { size: colPct, type: WidthType.PERCENTAGE },
    })
  );

  const dataRows = getRows(data, columns).map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })], alignment: columns[ci].align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT })],
          shading: { fill: ri % 2 === 0 ? 'F0F4F8' : 'FFFFFF' },
          width: { size: colPct, type: WidthType.PERCENTAGE },
        })
      ),
    })
  );

  const table = new Table({
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:             { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom:          { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left:            { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right:           { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideHorizontal:{ style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical:  { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  });

  const doc = new Document({
    sections: [{
      children: [
        ...(title ? [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        ] : []),
        new Paragraph({
          children: [new TextRun({ text: `Exported: ${new Date().toLocaleString()}`, italics: true, color: '666666', size: 18 })],
          spacing: { after: 300 },
        }),
        table,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

/* ── Dispatcher ───────────────────────────────────────────── */
export async function exportData(
  format: ExportFormat,
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
) {
  switch (format) {
    case 'csv':  return exportCsv(data, columns, filename);
    case 'xlsx': return exportXlsx(data, columns, filename);
    case 'json': return exportJson(data, columns, filename);
    case 'md':   return exportMd(data, columns, filename, title);
    case 'docx': return exportDocx(data, columns, filename, title);
  }
}
