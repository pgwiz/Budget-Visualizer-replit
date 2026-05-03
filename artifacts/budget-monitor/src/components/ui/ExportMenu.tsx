import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, Check, Loader2 } from 'lucide-react';
import { exportData, type ExportFormat, type ExportColumn } from '@/lib/export';

interface ExportMenuProps {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  disabled?: boolean;
}

const FORMATS: { value: ExportFormat; label: string; ext: string; desc: string; icon: string }[] = [
  { value: 'xlsx', label: 'Excel',    ext: '.xlsx', desc: 'Spreadsheet with rows & columns', icon: '📊' },
  { value: 'csv',  label: 'CSV',      ext: '.csv',  desc: 'Comma-separated values, any app', icon: '📋' },
  { value: 'docx', label: 'Word',     ext: '.docx', desc: 'Formatted document with table',   icon: '📄' },
  { value: 'md',   label: 'Markdown', ext: '.md',   desc: 'Plain text with markdown table',  icon: '📝' },
  { value: 'json', label: 'JSON',     ext: '.json', desc: 'Structured data for developers',  icon: '🗂️' },
];

export function ExportMenu({ data, columns, filename, title, disabled }: ExportMenuProps) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [done, setDone]       = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (fmt: ExportFormat) => {
    if (loading) return;
    setLoading(fmt);
    try {
      await exportData(fmt, data, columns, filename, title);
      setDone(fmt);
      setTimeout(() => setDone(null), 2000);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setLoading(null);
      setTimeout(() => setOpen(false), 800);
    }
  };

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
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#0d1527] shadow-2xl overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-white/8">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/30">Choose format</p>
              <p className="text-xs text-white/20 mt-0.5">{data.length} rows · {columns.length} columns</p>
            </div>

            <div className="py-2">
              {FORMATS.map(fmt => {
                const isLoading = loading === fmt.value;
                const isDone    = done === fmt.value;
                return (
                  <button
                    key={fmt.value}
                    onClick={() => handleExport(fmt.value)}
                    disabled={!!loading}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/6 transition-colors disabled:opacity-50 text-left"
                  >
                    <span className="text-lg leading-none w-7 text-center shrink-0">{fmt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{fmt.label}</span>
                        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{fmt.ext}</span>
                      </div>
                      <p className="text-[11px] text-white/30 truncate">{fmt.desc}</p>
                    </div>
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isLoading && <Loader2 size={14} className="animate-spin text-blue-400" />}
                      {isDone    && <Check size={14} className="text-emerald-400" />}
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
