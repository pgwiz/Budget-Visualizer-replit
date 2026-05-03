import * as XLSX from 'xlsx';
import {
  Document, Packer, Paragraph, Table, TableCell, TableRow,
  TextRun, WidthType, AlignmentType, HeadingLevel, BorderStyle,
  ImageRun, ShadingType,
} from 'docx';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'md' | 'docx' | 'pdf';

export interface ExportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  numeric?: boolean;
}

export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download  = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getStringRows(data: Record<string, any>[], columns: ExportColumn[]) {
  return data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      return val == null ? '' : String(val);
    })
  );
}

function autoColWidth(label: string, data: Record<string, any>[], key: string): number {
  const max = Math.max(label.length, ...data.map(r => String(r[key] ?? '').length));
  return Math.min(Math.max(max + 2, 12), 55);
}

/* ── Canvas bar-chart → PNG Uint8Array ────────────────────────── */
export async function renderChartImage(
  items: ChartDataItem[],
  options?: { width?: number; height?: number; title?: string },
): Promise<Uint8Array> {
  const W = options?.width  ?? 640;
  const H = options?.height ?? 280;

  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  const PALETTE = [
    '#3b82f6','#10b981','#f59e0b','#6366f1','#ef4444',
    '#14b8a6','#8b5cf6','#f97316','#06b6d4','#84cc16',
  ];

  const TOP_PAD = options?.title ? 40 : 20;
  const BOT_PAD = 60;
  const L_PAD   = 80;
  const R_PAD   = 20;
  const plotW   = W - L_PAD - R_PAD;
  const plotH   = H - TOP_PAD - BOT_PAD;
  const n       = items.length;
  const barW    = Math.max(10, (plotW / n) * 0.65);
  const gap     = (plotW / n) * 0.35;
  const maxVal  = Math.max(...items.map(d => d.value), 1);

  // Title
  if (options?.title) {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.title, W / 2, 26);
  }

  // Grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = TOP_PAD + plotH - (plotH * i / gridLines);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(L_PAD, y); ctx.lineTo(W - R_PAD, y); ctx.stroke();
    ctx.setLineDash([]);

    // Y-axis label
    const val = (maxVal * i / gridLines);
    const label = val >= 1e9 ? `${(val/1e9).toFixed(1)}B` :
                  val >= 1e6 ? `${(val/1e6).toFixed(0)}M` :
                  val >= 1e3 ? `${(val/1e3).toFixed(0)}K` : val.toFixed(0);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, L_PAD - 8, y + 4);
  }

  // Bars
  items.forEach((item, i) => {
    const barH = (item.value / maxVal) * plotH;
    const x    = L_PAD + i * (plotW / n) + gap / 2;
    const y    = TOP_PAD + plotH - barH;
    const color = item.color ?? PALETTE[i % PALETTE.length];

    // Bar shadow
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur  = 4;
    ctx.fillStyle   = color;

    // Rounded top bar
    const r = Math.min(4, barW / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Value on top
    const valStr = item.value >= 1e9 ? `${(item.value/1e9).toFixed(1)}B` :
                   item.value >= 1e6 ? `${(item.value/1e6).toFixed(0)}M` :
                   item.value >= 1e3 ? `${(item.value/1e3).toFixed(0)}K` : String(item.value);
    ctx.fillStyle = '#1e293b';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (barH > 18) ctx.fillText(valStr, x + barW / 2, y - 5);

    // X label (truncated, rotated if many bars)
    const maxLabelLen = Math.floor(barW / 6) + 4;
    const lbl = item.label.length > maxLabelLen ? item.label.slice(0, maxLabelLen) + '…' : item.label;
    ctx.save();
    ctx.translate(x + barW / 2, TOP_PAD + plotH + 14);
    if (n > 8) ctx.rotate(-Math.PI / 5);
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = n > 8 ? 'right' : 'center';
    ctx.fillStyle = '#374151';
    ctx.fillText(lbl, 0, 0);
    ctx.restore();
  });

  // Axis line
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(L_PAD, TOP_PAD);
  ctx.lineTo(L_PAD, TOP_PAD + plotH);
  ctx.lineTo(W - R_PAD, TOP_PAD + plotH);
  ctx.stroke();

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      blob!.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
}

/* ── CSV ──────────────────────────────────────────────────────── */
export function exportCsv(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows   = getStringRows(data, columns).map(r =>
    r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
  );
  downloadBlob(new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

/* ── XLSX (multi-sheet, real numbers, styled) ─────────────────── */
export function exportXlsx(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  options?: {
    sheetName?: string;
    title?: string;
    summaryItems?: { label: string; value: string }[];
    extraSheets?: { name: string; data: Record<string, any>[]; columns: ExportColumn[] }[];
  },
) {
  const wb = XLSX.utils.book_new();

  // ── Summary sheet (if summary items provided) ──
  if (options?.summaryItems?.length) {
    const summaryData: any[][] = [
      [options.title ?? filename],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Metric', 'Value'],
      ...options.summaryItems.map(s => [s.label, s.value]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    ws['!cols'] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // ── Main data sheet ──
  const buildSheet = (sheetData: Record<string, any>[], sheetCols: ExportColumn[]) => {
    const header = sheetCols.map(c => c.label);
    const rows = sheetData.map(row =>
      sheetCols.map(col => {
        const val = row[col.key];
        if (val == null) return '';
        if (col.numeric && typeof val === 'number') return val;
        return String(val);
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = sheetCols.map(col => ({ wch: autoColWidth(col.label, sheetData, col.key) }));

    // Set number format for numeric columns
    sheetCols.forEach((col, ci) => {
      if (!col.numeric) return;
      sheetData.forEach((_, ri) => {
        const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (ws[cellRef]) ws[cellRef].z = '#,##0.00';
      });
    });

    return ws;
  };

  XLSX.utils.book_append_sheet(wb, buildSheet(data, columns), options?.sheetName ?? 'Data');

  // ── Extra sheets ──
  options?.extraSheets?.forEach(sheet => {
    XLSX.utils.book_append_sheet(wb, buildSheet(sheet.data, sheet.columns), sheet.name.slice(0, 31));
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/* ── JSON ─────────────────────────────────────────────────────── */
export function exportJson(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
) {
  const shaped = data.map(row => {
    const out: Record<string, any> = {};
    columns.forEach(col => { out[col.label] = row[col.key] ?? null; });
    return out;
  });
  downloadBlob(new Blob([JSON.stringify(shaped, null, 2)], { type: 'application/json' }), `${filename}.json`);
}

/* ── Markdown ─────────────────────────────────────────────────── */
export function exportMd(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
) {
  const colWidths = columns.map(col => {
    const max = Math.max(col.label.length, ...data.map(row => String(row[col.key] ?? '').length));
    return Math.min(max, 45);
  });

  const pad = (s: string, w: number, align: ExportColumn['align']) => {
    s = s.slice(0, w);
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
  const rows = getStringRows(data, columns).map(r =>
    '| ' + r.map((v, i) => pad(v, colWidths[i], columns[i].align)).join(' | ') + ' |'
  );

  const lines = [
    title ? `# ${title}\n` : '',
    `_Generated: ${new Date().toLocaleString()}_\n`,
    header, separator, ...rows,
  ].filter(Boolean);

  downloadBlob(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' }), `${filename}.md`);
}

/* ── DOCX (with optional chart image & summary stats) ────────── */
export async function exportDocx(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  options?: {
    title?: string;
    subtitle?: string;
    institution?: string;
    summaryItems?: { label: string; value: string }[];
    chartData?: ChartDataItem[];
    chartTitle?: string;
  },
) {
  const colCount = columns.length;
  const colPct   = Math.floor(100 / colCount);

  /* ── Shared border def ── */
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' };
  const tableBorders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

  /* ── Header row ── */
  const headerCells = columns.map(col =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: col.label, bold: true, color: 'FFFFFF', size: 20 })],
        alignment: col.align === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER,
      })],
      shading: { type: ShadingType.SOLID, fill: '1E3A8A' },
      width: { size: colPct, type: WidthType.PERCENTAGE },
    })
  );

  /* ── Data rows ── */
  const dataRows = getStringRows(data, columns).map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 18 })],
            alignment: columns[ci].align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
          })],
          shading: { type: ShadingType.SOLID, fill: ri % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
          width: { size: colPct, type: WidthType.PERCENTAGE },
        })
      ),
    })
  );

  const dataTable = new Table({
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });

  /* ── Summary table ── */
  const summaryRows = (options?.summaryItems ?? []).map((item, ri) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: item.label, bold: true, size: 18 })] })],
          shading: { type: ShadingType.SOLID, fill: ri % 2 === 0 ? 'EFF6FF' : 'DBEAFE' },
          width: { size: 40, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: item.value, size: 18 })], alignment: AlignmentType.RIGHT })],
          shading: { type: ShadingType.SOLID, fill: ri % 2 === 0 ? 'EFF6FF' : 'DBEAFE' },
          width: { size: 60, type: WidthType.PERCENTAGE },
        }),
      ],
    })
  );

  /* ── Chart image ── */
  let chartImageRun: ImageRun | null = null;
  if (options?.chartData?.length) {
    try {
      const imgData = await renderChartImage(options.chartData, {
        width: 620, height: 280, title: options.chartTitle,
      });
      chartImageRun = new ImageRun({
        data: imgData,
        transformation: { width: 550, height: 240 },
        type: 'png',
      });
    } catch {
      /* chart generation failed silently */
    }
  }

  /* ── Build doc sections ── */
  const children: any[] = [];

  // Institution header
  if (options?.institution) {
    children.push(new Paragraph({
      children: [new TextRun({ text: options.institution, bold: true, size: 24, color: '1E3A8A' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }));
  }

  // Title
  if (options?.title) {
    children.push(new Paragraph({
      text: options.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  // Subtitle / date
  children.push(new Paragraph({
    children: [new TextRun({
      text: options?.subtitle
        ? `${options.subtitle}  ·  Generated: ${new Date().toLocaleString()}`
        : `Generated: ${new Date().toLocaleString()}`,
      italics: true, color: '64748B', size: 18,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));

  // Summary table
  if (summaryRows.length) {
    children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
    children.push(new Table({
      rows: summaryRows,
      width: { size: 60, type: WidthType.PERCENTAGE },
      borders: tableBorders,
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  }

  // Chart
  if (chartImageRun) {
    children.push(new Paragraph({ text: options?.chartTitle ?? 'Chart', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
    children.push(new Paragraph({ children: [chartImageRun], alignment: AlignmentType.CENTER, spacing: { after: 300 } }));
  }

  // Data section heading
  children.push(new Paragraph({ text: 'Data', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
  children.push(dataTable);

  const doc = new Document({ sections: [{ children }] });
  downloadBlob(await Packer.toBlob(doc), `${filename}.docx`);
}

/* ── PDF via browser print ────────────────────────────────────── */
export function exportPdf(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
) {
  const header = columns.map(c => `<th style="background:#1e3a8a;color:#fff;padding:8px 12px;text-align:${c.align ?? 'left'}">${c.label}</th>`).join('');
  const rows = getStringRows(data, columns).map((row, ri) =>
    `<tr style="background:${ri % 2 === 0 ? '#f8fafc' : '#fff'}">${
      row.map((v, ci) => `<td style="padding:6px 12px;text-align:${columns[ci].align ?? 'left'}">${v}</td>`).join('')
    }</tr>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title ?? filename}</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 11px; color: #1e293b; }
  h1 { font-size: 16px; color: #1e3a8a; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 10px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
${title ? `<h1>${title}</h1>` : ''}
<div class="meta">Generated: ${new Date().toLocaleString()} &nbsp;·&nbsp; ${data.length} records</div>
<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

  const w = window.open('', '_blank')!;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

/* ── Dispatcher ───────────────────────────────────────────────── */
export async function exportData(
  format: ExportFormat,
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  options?: {
    title?: string;
    subtitle?: string;
    institution?: string;
    summaryItems?: { label: string; value: string }[];
    chartData?: ChartDataItem[];
    chartTitle?: string;
    sheetName?: string;
    extraSheets?: { name: string; data: Record<string, any>[]; columns: ExportColumn[] }[];
  },
) {
  switch (format) {
    case 'csv':  return exportCsv(data, columns, filename);
    case 'xlsx': return exportXlsx(data, columns, filename, options);
    case 'json': return exportJson(data, columns, filename);
    case 'md':   return exportMd(data, columns, filename, options?.title);
    case 'docx': return exportDocx(data, columns, filename, options);
    case 'pdf':  return exportPdf(data, columns, filename, options?.title);
  }
}
