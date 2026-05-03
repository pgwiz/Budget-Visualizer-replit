import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGetSectorTree,
  useListSectors,
  useCreateSector,
  useUpdateSector,
  useDeleteSector,
  SectorTreeNode,
} from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UtilizationRing } from '@/components/hierarchy/UtilizationRing';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/api';
import {
  Plus, Trash2, Edit3, ChevronDown, ChevronRight, X, Save,
  GitBranch, AlertTriangle, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

/* ─────────────────────────────────────────────────────────── */
/*  Types & helpers                                            */
/* ─────────────────────────────────────────────────────────── */
type FormMode = 'add' | 'edit' | null;

interface FormState {
  name: string;
  code: string;
  parentId: number | null;
  sortOrder: number;
}

const EMPTY_FORM: FormState = { name: '', code: '', parentId: null, sortOrder: 0 };

function nodeColor(pct: number) {
  if (pct >= 90) return { border: 'border-rose-500/40', bg: 'bg-rose-500/5', badge: 'text-rose-400' };
  if (pct >= 70) return { border: 'border-amber-500/40', bg: 'bg-amber-500/5', badge: 'text-amber-400' };
  if (pct >= 40) return { border: 'border-blue-500/30', bg: 'bg-blue-500/5', badge: 'text-blue-400' };
  return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', badge: 'text-emerald-400' };
}

function flattenTree(nodes: SectorTreeNode[]): SectorTreeNode[] {
  const result: SectorTreeNode[] = [];
  function walk(n: SectorTreeNode) {
    result.push(n);
    (n.children ?? []).forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

/* ─────────────────────────────────────────────────────────── */
/*  DesignerTreeNode — recursive tree node with actions        */
/* ─────────────────────────────────────────────────────────── */
interface TreeNodeProps {
  node: SectorTreeNode;
  depth: number;
  selectedId: number | null;
  expandedIds: Set<number>;
  onSelect: (n: SectorTreeNode) => void;
  onToggle: (id: number) => void;
  onAddChild: (parent: SectorTreeNode) => void;
  onEdit: (n: SectorTreeNode) => void;
  onDelete: (n: SectorTreeNode) => void;
}

function DesignerTreeNode({
  node, depth, selectedId, expandedIds,
  onSelect, onToggle, onAddChild, onEdit, onDelete,
}: TreeNodeProps) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const colors = nodeColor(node.utilizationPct);

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: depth * 0.04 }}
        style={{ paddingLeft: depth * 20 }}
      >
        <div
          className={cn(
            'flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer group',
            isSelected
              ? 'border-blue-400/60 bg-blue-500/10 ring-1 ring-blue-400/20'
              : `${colors.border} ${colors.bg} hover:bg-white/5`,
          )}
          onClick={() => onSelect(node)}
        >
          {/* Expand toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className={cn(
              'w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/70 transition-colors shrink-0',
              !hasChildren && 'invisible',
            )}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {/* Mini ring */}
          <UtilizationRing value={node.utilizationPct} size={32} strokeWidth={3} showLabel={false} className="shrink-0" />

          {/* Name & code */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-semibold truncate', isSelected ? 'text-white' : 'text-white/80')}>
                {node.name}
              </span>
              <Badge variant="outline" className="text-[8px] px-1 py-0 font-bold uppercase tracking-wide shrink-0">
                {node.code}
              </Badge>
            </div>
            <p className="text-[9px] text-white/30 mt-0.5">{formatCurrency(node.netAllocated)} allocated</p>
          </div>

          {/* Pct */}
          <span className={cn('text-[10px] font-bold shrink-0', colors.badge)}>
            {Math.round(node.utilizationPct)}%
          </span>

          {/* Action buttons — show on hover/selected */}
          <div className={cn(
            'flex items-center gap-1 shrink-0 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}>
            <button
              onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
              className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              title="Add child sector"
            >
              <Plus size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
              className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title="Edit sector"
            >
              <Edit3 size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node); }}
              className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 transition-colors"
              title="Delete sector"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            key="ch"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 border-l border-white/8 ml-[22px] pl-2">
              {node.children.map((child) => (
                <DesignerTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Form Panel (right side)                                    */
/* ─────────────────────────────────────────────────────────── */
interface FormPanelProps {
  mode: FormMode;
  form: FormState;
  selectedNode: SectorTreeNode | null;
  sectors: SectorTreeNode[];  // flat list for parent dropdown
  isSaving: boolean;
  onChange: (k: keyof FormState, v: string | number | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

function FormPanel({ mode, form, selectedNode, sectors, isSaving, onChange, onSave, onCancel }: FormPanelProps) {
  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-20">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
          <GitBranch size={32} className="text-white/20" />
        </div>
        <div>
          <p className="text-white/40 font-semibold">Select a sector to edit</p>
          <p className="text-white/20 text-sm mt-1">or click "Add Sector" to create a new one</p>
        </div>
        <div className="flex flex-col gap-2 text-xs text-white/20 bg-white/5 rounded-2xl p-4 max-w-xs">
          <p className="font-bold text-white/30 mb-1">Quick actions on each node:</p>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center"><Plus size={10} className="text-emerald-400" /></span> Add child sector</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center"><Edit3 size={10} className="text-blue-400" /></span> Edit this sector</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-rose-500/20 flex items-center justify-center"><Trash2 size={10} className="text-rose-400" /></span> Delete sector</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={mode + (selectedNode?.id ?? 'new')}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            {mode === 'add' ? 'Add New Sector' : `Edit: ${selectedNode?.name}`}
          </h3>
          <p className="text-xs text-white/30 mt-0.5">
            {mode === 'add'
              ? form.parentId ? `Child of ${sectors.find(s => s.id === form.parentId)?.name ?? '...'}` : 'Top-level sector'
              : `Code: ${selectedNode?.code}`
            }
          </p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <Field label="Sector Name" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="e.g. Ministry of Agriculture"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
          />
        </Field>

        <Field label="Sector Code" required hint="Short identifier, e.g. AGRI, EDU, HEALTH">
          <input
            type="text"
            value={form.code}
            onChange={(e) => onChange('code', e.target.value.toUpperCase())}
            placeholder="e.g. AGRI"
            maxLength={10}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all font-mono uppercase tracking-wider"
          />
        </Field>

        <Field label="Parent Sector" hint="Leave empty to make this a top-level sector">
          <select
            value={form.parentId ?? ''}
            onChange={(e) => onChange('parentId', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <option value="" style={{ background: '#0f172a' }}>— None (top-level) —</option>
            {sectors
              .filter((s) => s.id !== selectedNode?.id)
              .map((s) => (
                <option key={s.id} value={s.id} style={{ background: '#0f172a' }}>
                  {'  '.repeat(s.depth ?? 0)}{s.name} ({s.code})
                </option>
              ))}
          </select>
        </Field>

        <Field label="Display Order" hint="Determines order among siblings (lower = first)">
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => onChange('sortOrder', parseInt(e.target.value) || 0)}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all"
          />
        </Field>
      </div>

      {/* Warning for edit with budget */}
      {mode === 'edit' && selectedNode && selectedNode.netAllocated > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80">
            This sector has {formatCurrency(selectedNode.netAllocated)} allocated. Changing its parent may affect hierarchy calculations.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={isSaving || !form.name.trim() || !form.code.trim()}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
            isSaving || !form.name.trim() || !form.code.trim()
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-blue-500/25 hover:bg-blue-500/35 border border-blue-500/40 text-blue-300 hover:border-blue-400/60',
          )}
        >
          {isSaving ? (
            <LoadingSpinner size={16} className="h-auto" />
          ) : (
            <Save size={15} />
          )}
          {isSaving ? 'Saving…' : mode === 'add' ? 'Create Sector' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/25 text-sm transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-white/25 mt-1.5">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Delete confirmation dialog                                 */
/* ─────────────────────────────────────────────────────────── */
function DeleteConfirmDialog({
  node,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  node: SectorTreeNode;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md p-6 rounded-3xl"
          style={{
            background: 'rgba(10,18,40,0.98)',
            border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
              <Trash2 size={18} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Sector</h3>
              <p className="text-xs text-white/40">This action cannot be undone</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/8 mb-5">
            <p className="text-sm text-white font-semibold">{node.name}</p>
            <p className="text-xs text-white/40 mt-0.5">Code: {node.code}</p>
            {(node.children?.length ?? 0) > 0 && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Has {node.children.length} child sector{node.children.length > 1 ? 's' : ''} — they will be re-parented or deleted
              </p>
            )}
            {node.netAllocated > 0 && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Has {formatCurrency(node.netAllocated)} active allocations
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              {isDeleting ? <LoadingSpinner size={14} className="h-auto" /> : <Trash2 size={14} />}
              {isDeleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main HierarchyDesignerPage                                 */
/* ─────────────────────────────────────────────────────────── */
export default function HierarchyDesignerPage() {
  const { toast } = useToast();
  const { data: tree, isLoading: treeLoading } = useGetSectorTree();
  const { data: sectors } = useListSectors();

  const createMutation = useCreateSector();
  const updateMutation = useUpdateSector();
  const deleteMutation = useDeleteSector();

  const [selectedNode, setSelectedNode] = useState<SectorTreeNode | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<SectorTreeNode | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // Flat sectors for dropdown (from the sectors list which has depth info)
  const flatSectors = (sectors ?? []) as unknown as SectorTreeNode[];
  // Also flatten tree for completeness
  const flatTree = flattenTree(tree ?? []);

  // Filter tree display by search
  function nodeMatchesSearch(n: SectorTreeNode, q: string): boolean {
    const lq = q.toLowerCase();
    if (n.name.toLowerCase().includes(lq) || n.code.toLowerCase().includes(lq)) return true;
    return (n.children ?? []).some((c) => nodeMatchesSearch(c, q));
  }
  const filteredTree = searchQ.trim()
    ? (tree ?? []).filter((n) => nodeMatchesSearch(n, searchQ))
    : (tree ?? []);

  // On mount, expand first level
  useState(() => {
    if (tree) setExpandedIds(new Set(tree.map((n) => n.id)));
  });

  const handleToggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((n: SectorTreeNode) => {
    setSelectedNode(n);
    setFormMode(null);
  }, []);

  const handleAddChild = useCallback((parent: SectorTreeNode) => {
    setSelectedNode(parent);
    setForm({ ...EMPTY_FORM, parentId: parent.id });
    setFormMode('add');
    setExpandedIds((prev) => new Set([...prev, parent.id]));
  }, []);

  const handleEdit = useCallback((n: SectorTreeNode) => {
    setSelectedNode(n);
    setForm({
      name: n.name,
      code: n.code,
      parentId: n.parentId ?? null,
      sortOrder: 0,
    });
    setFormMode('edit');
  }, []);

  const handleDelete = useCallback((n: SectorTreeNode) => {
    setDeleteTarget(n);
  }, []);

  const handleFormChange = useCallback((k: keyof FormState, v: string | number | null) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['listSectors'] });
    queryClient.invalidateQueries({ queryKey: ['getSectorTree'] });
    queryClient.invalidateQueries({ queryKey: ['getDashboardSummary'] });
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    try {
      if (formMode === 'add') {
        await createMutation.mutateAsync({
          data: { name: form.name.trim(), code: form.code.trim(), parentId: form.parentId, sortOrder: form.sortOrder },
        });
        toast({ title: 'Sector created', description: `${form.name} has been added to the hierarchy.` });
      } else if (formMode === 'edit' && selectedNode) {
        await updateMutation.mutateAsync({
          sectorId: selectedNode.id,
          data: { name: form.name.trim(), code: form.code.trim(), parentId: form.parentId, sortOrder: form.sortOrder },
        });
        toast({ title: 'Sector updated', description: `${form.name} has been saved.` });
      }
      invalidateQueries();
      setFormMode(null);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  }, [form, formMode, selectedNode, createMutation, updateMutation, toast, invalidateQueries]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ sectorId: deleteTarget.id });
      toast({ title: 'Sector deleted', description: `${deleteTarget.name} has been removed.` });
      invalidateQueries();
      if (selectedNode?.id === deleteTarget.id) {
        setSelectedNode(null);
        setFormMode(null);
      }
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.message ?? 'Could not delete sector', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, toast, invalidateQueries, selectedNode]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/sectors">
              <a className="text-xs text-blue-400 hover:underline">← Sectors</a>
            </Link>
          </div>
          <h2 className="text-3xl font-bold text-white mt-1">Hierarchy Designer</h2>
          <p className="text-white/40 mt-1">Build and manage the organizational budget structure</p>
        </div>
        <button
          onClick={() => { setSelectedNode(null); setForm(EMPTY_FORM); setFormMode('add'); }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold text-sm transition-all hover:border-blue-400/50"
        >
          <Plus size={16} />
          Add Top-Level Sector
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sectors', value: flatTree.length, color: 'text-blue-400' },
          { label: 'Top-Level', value: (tree ?? []).length, color: 'text-emerald-400' },
          { label: 'Max Depth', value: flatTree.reduce((m, n) => Math.max(m, n.depth ?? 0), 0) + 1, color: 'text-amber-400' },
          { label: 'With Sub-Sectors', value: flatTree.filter((n) => (n.children?.length ?? 0) > 0).length, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">{label}</p>
            <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        {/* Left: Tree */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Search */}
          <GlassCard className="p-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search sectors by name or code…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-all"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
          </GlassCard>

          <GlassCard
            className="flex-1 overflow-hidden"
            header={
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Current Hierarchy</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedIds(new Set(flatTree.map((n) => n.id)))}
                    className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Expand all
                  </button>
                  <button
                    onClick={() => setExpandedIds(new Set())}
                    className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Collapse all
                  </button>
                </div>
              </div>
            }
          >
            {treeLoading ? (
              <LoadingSpinner size={36} className="py-20" />
            ) : filteredTree.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-white/20 gap-3">
                <GitBranch size={36} className="opacity-30" />
                <p className="text-sm">{searchQ ? 'No sectors match your search' : 'No sectors defined yet'}</p>
                <button
                  onClick={() => { setForm(EMPTY_FORM); setFormMode('add'); }}
                  className="text-xs text-blue-400 hover:underline mt-1"
                >
                  Add your first sector →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[520px] pr-1 -mr-1">
                {filteredTree.map((node) => (
                  <DesignerTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedNode?.id ?? null}
                    expandedIds={expandedIds}
                    onSelect={handleSelect}
                    onToggle={handleToggle}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Form / Detail panel */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full" header={<h3 className="font-bold text-white">{formMode === 'add' ? 'New Sector' : formMode === 'edit' ? 'Edit Sector' : selectedNode ? 'Sector Info' : 'Actions'}</h3>}>
            {formMode ? (
              <FormPanel
                mode={formMode}
                form={form}
                selectedNode={selectedNode}
                sectors={flatSectors.length > 0 ? flatSectors : flatTree}
                isSaving={isSaving}
                onChange={handleFormChange}
                onSave={handleSave}
                onCancel={() => { setFormMode(null); setForm(EMPTY_FORM); }}
              />
            ) : selectedNode ? (
              <SectorInfoPanel
                node={selectedNode}
                onEdit={() => handleEdit(selectedNode)}
                onAddChild={() => handleAddChild(selectedNode)}
                onDelete={() => handleDelete(selectedNode)}
              />
            ) : (
              <FormPanel
                mode={null}
                form={form}
                selectedNode={null}
                sectors={flatSectors}
                isSaving={false}
                onChange={handleFormChange}
                onSave={handleSave}
                onCancel={() => setFormMode(null)}
              />
            )}
          </GlassCard>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          node={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Sector Info Panel (when a node is selected, no edit mode) */
/* ─────────────────────────────────────────────────────────── */
function SectorInfoPanel({
  node,
  onEdit,
  onAddChild,
  onDelete,
}: {
  node: SectorTreeNode;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <UtilizationRing value={node.utilizationPct} size={68} strokeWidth={5} />
        <div>
          <h3 className="text-base font-bold text-white">{node.name}</h3>
          <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider mt-1">{node.code}</Badge>
          {node.responsibleUser && (
            <p className="text-xs text-white/30 mt-1">Head: {node.responsibleUser.name}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Net Allocated', val: node.netAllocated, color: 'text-blue-400' },
          { label: 'Available', val: node.availableBalance, color: 'text-emerald-400' },
          { label: 'Utilization', val: `${Math.round(node.utilizationPct)}%`, color: node.utilizationPct >= 90 ? 'text-rose-400' : 'text-amber-400' },
          { label: 'Sub-Sectors', val: node.children?.length ?? 0, color: 'text-white/70' },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass p-3 rounded-xl">
            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">{label}</p>
            <p className={cn('text-sm font-bold mt-1', color)}>{typeof val === 'number' && label !== 'Sub-Sectors' && label !== 'Utilization' ? formatCurrency(val as number) : val}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button onClick={onAddChild} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-semibold text-sm transition-all">
          <Plus size={15} /> Add Child Sector
        </button>
        <button onClick={onEdit} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-semibold text-sm transition-all">
          <Edit3 size={15} /> Edit This Sector
        </button>
        <Link href={`/sectors/${node.id}`}>
          <a className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-semibold text-sm transition-all">
            <GitBranch size={15} /> View Budget Details
          </a>
        </Link>
        <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/8 hover:bg-rose-500/15 border border-rose-500/15 text-rose-400/80 hover:text-rose-400 font-semibold text-sm transition-all">
          <Trash2 size={15} /> Delete Sector
        </button>
      </div>
    </motion.div>
  );
}
