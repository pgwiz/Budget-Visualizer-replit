import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, Check, Loader2 } from 'lucide-react';
import { exportData, type ExportFormat, type ExportColumn, type ChartDataItem } from '@/lib/export';

interface ExportMenuProps {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  institution?: string;
  summaryItems?: { label: string; value: string }[];
  chartData?: ChartDataItem[];
  chartTitle?: string;
  sheetName?: string;
  extraSheets?: { name: string; data: Record<string, any>[]; columns: ExportColumn[] }[];
  disabled?: boolean;
}

const FORMATS: { value: ExportFormat; label: string; ext: string; desc: string; icon: string }[] = [
  { value: 'xlsx', label: 'Excel',    ext: '.xlsx', desc: 'Spreadsheet · summary + chart sheet',    icon: '📊' },
  { value: 'docx', label: 'Word',     ext: '.docx', desc: 'Document · header, stats & bar chart',  icon: '📄' },
  { value: 'pdf',  label: 'PDF',      ext: '.pdf',  desc: 'Print-ready · opens in browser',        icon: '🖨️' },
  { value: 'csv',  label: 'CSV',      ext: '.csv',  desc: 'Comma-separated · any spreadsheet app', icon: '📋' },
  { value: 'md',   label: 'Markdown', ext: '.md',   desc: 'Plain text table format',               icon: '📝' },
  { value: 'json', label: 'JSON',     ext: '.json', desc: 'Structured data for developers',        icon: '🗂️' },
];

export function ExportMenu({
  data, columns, filename, title, institution,
  summaryItems, chartData, chartTitle, sheetName, extraSheets,
  disabled,
}: ExportMenuProps) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [done,    setDone]    = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleExport = async (fmt: ExportFormat) => {
    if (loading) return;
    setLoading(fmt);
    try {
      await exportData(fmt, data, columns, filename, {
        title, institution, summaryItems, chartData, chartTitle, sheetName, extraSheets,
      });
      setDone(fmt);
      setTimeout(() => setDone(null), 2000);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setLoading(null);
      setTimeout(() => setOpen(false), 800);
    }
  };

  const hasChart   = !!chartData?.length;
  const hasSummary = !!summaryItems?.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled || !!loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/15 bg-white/8 hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Export
        <ChevronDown size={13} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-[#0d1527] shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/8">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/30">Export as</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-white/25">{data.length} rows</p>
                {hasSummary && (
                  <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">
                    + Summary
                  </span>
                )}
                {hasChart && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                    + Chart
                  </span>
                )}
              </div>
            </div>

            {/* Formats */}
            <div className="py-2">
              {FORMATS.map(fmt => {
                const isLoading = loading === fmt.value;
                const isDone    = done === fmt.value;
                const supportsChart   = (fmt.value === 'docx') && hasChart;
                const supportsSummary = (fmt.value === 'xlsx' || fmt.value === 'docx') && hasSummary;

                return (
                  <button
                    key={fmt.value}
                    onClick={() => handleExport(fmt.value)}
                    disabled={!!loading}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/6 transition-colors disabled:opacity-50 text-left"
                  >
                    <span className="text-lg leading-none w-7 text-center shrink-0">{fmt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{fmt.label}</span>
                        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{fmt.ext}</span>
                        {supportsChart   && <span className="text-[9px] text-emerald-400 font-bold">CHART</span>}
                        {supportsSummary && <span className="text-[9px] text-blue-400 font-bold">STATS</span>}
                      </div>
                      <p className="text-[11px] text-white/30 truncate">{fmt.desc}</p>
                    </div>
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isLoading && <Loader2 size={14} className="animate-spin text-blue-400" />}
                      {isDone    && <Check    size={14} className="text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2.5 border-t border-white/8 bg-white/3">
              <p className="text-[10px] text-white/20 text-center">File downloads to your device automatically</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
