import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBox, faPlus, faSearch, faEdit, faTrashAlt, faTimes, faCheck,
  faChevronDown, faChevronRight, faTag,
} from '@fortawesome/free-solid-svg-icons';
import type { Product } from '@workspace/api-client-react';

const CATEGORY_COLORS: Record<string, string> = {
  'Building Materials':   '#f59e0b',
  'Office Supplies':      '#3b82f6',
  'ICT Equipment':        '#6366f1',
  'Transport & Fuel':     '#ef4444',
  'Furniture':            '#10b981',
  'Cleaning & Sanitation':'#8b5cf6',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? '#64748b';
}

function formatKsh(n: number) {
  return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── Inline product form ──────────────────────────────────── */
interface ProductFormProps {
  initial?: Partial<Product>;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
  categories: string[];
}

function ProductForm({ initial, onSave, onCancel, saving, categories }: ProductFormProps) {
  const [name, setName]         = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? (categories[0] ?? ''));
  const [unit, setUnit]         = useState(initial?.unit ?? '');
  const [unitPrice, setPrice]   = useState(String(initial?.unitPrice ?? ''));
  const [description, setDesc]  = useState(initial?.description ?? '');

  const valid = name.trim() && category.trim() && unit.trim() && parseFloat(unitPrice) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Product Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cement" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Category</Label>
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Building Materials" list="cats" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
          <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Unit</Label>
          <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. bag, litre, unit" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Unit Price (KSh)</Label>
          <Input type="number" min="0" value={unitPrice} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Description (optional)</Label>
          <Input value={description} onChange={e => setDesc(e.target.value)} placeholder="Brief description..." className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={() => onSave({ name: name.trim(), category: category.trim(), unit: unit.trim(), unitPrice: parseFloat(unitPrice), description: description.trim() || undefined })}
          disabled={!valid || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-900 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <LoadingSpinner size={14} className="p-0 text-gray-900" /> : <FontAwesomeIcon icon={faCheck} className="text-[14px]" />}
          {initial ? 'Update' : 'Add Product'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2">
          <FontAwesomeIcon icon={faTimes} className="text-[14px]" /> Cancel
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Single product row ───────────────────────────────────── */
function ProductRow({ product, canEdit, onEdit, onDelete }: { product: Product; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const color = categoryColor(product.category);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-50 transition-colors group"
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
        {product.description && <p className="text-xs text-gray-400 truncate">{product.description}</p>}
      </div>
      <span className="text-xs text-gray-500 shrink-0">per {product.unit}</span>
      <span className="text-sm font-bold text-emerald-400 shrink-0">{formatKsh(product.unitPrice)}</span>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all">
            <FontAwesomeIcon icon={faEdit} className="text-[13px]" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all">
            <FontAwesomeIcon icon={faTrashAlt} className="text-[13px]" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main page ────────────────────────────────────────────── */
export default function CatalogPage() {
  const { isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin;
  const [search, setSearch]       = useState('');
  const [adding, setAdding]       = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: rawProducts, isLoading } = useListProducts(
    {},
    { query: { queryKey: ['products'], staleTime: 30000 } }
  );
  const products = Array.isArray(rawProducts) ? rawProducts : [];

  const createMutation = useCreateProduct({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setAdding(false); } } });
  const updateMutation = useUpdateProduct({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setEditId(null); } } });
  const deleteMutation = useDeleteProduct({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }) } });

  const categories: string[] = [...new Set(products.map((p: Product) => p.category))].sort();

  const filtered = search
    ? products.filter((p: Product) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : products;

  const grouped = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat as string] = filtered.filter((p: Product) => p.category === cat);
    return acc;
  }, {});

  const toggleCollapse = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faBox} className="text-[22px] text-amber-400" />
            Product Catalog
          </h1>
          <p className="text-gray-400 text-sm mt-1">{products.length} products across {categories.length} categories · preloaded procurement items</p>
        </div>
        {canEdit && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-900 bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[15px]" /> Add Product
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative flex items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products or categories..."
          className="w-full h-11 pl-5 pr-14 rounded-full border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#4B117A]/40 focus:ring-2 focus:ring-[#4B117A]/10 transition-all"
        />
        <button className="absolute right-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all"
          style={{ background: '#4B117A' }}>
          <FontAwesomeIcon icon={faSearch} className="text-white text-[13px]" />
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <ProductForm
            categories={categories}
            onSave={data => createMutation.mutate({ data })}
            onCancel={() => setAdding(false)}
            saving={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size={36} /></div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => {
            const items = grouped[cat] ?? [];
            if (!items.length) return null;
            const isOpen = !collapsed.has(cat);
            const color  = categoryColor(cat);
            return (
              <GlassCard
                key={cat}
                header={
                  <button
                    onClick={() => toggleCollapse(cat)}
                    className="flex items-center justify-between w-full gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faTag} className="text-[14px]" style={{ color }} />
                      <span className="font-bold text-gray-900 text-sm">{cat}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                        {items.length} items
                      </span>
                    </div>
                    {isOpen ? <FontAwesomeIcon icon={faChevronDown} className="text-[15px] text-gray-400" /> : <FontAwesomeIcon icon={faChevronRight} className="text-[15px] text-gray-400" />}
                  </button>
                }
              >
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      {items.map((product: Product) => (
                        editId === product.id ? (
                          <AnimatePresence key={product.id}>
                            <ProductForm
                              initial={product}
                              categories={categories}
                              onSave={data => updateMutation.mutate({ productId: product.id, data })}
                              onCancel={() => setEditId(null)}
                              saving={updateMutation.isPending}
                            />
                          </AnimatePresence>
                        ) : (
                          <ProductRow
                            key={product.id}
                            product={product}
                            canEdit={canEdit}
                            onEdit={() => setEditId(product.id)}
                            onDelete={() => { if (confirm(`Delete "${product.name}"?`)) deleteMutation.mutate({ productId: product.id }); }}
                          />
                        )
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}

          {filtered.length === 0 && !isLoading && (
            <div className="flex flex-col items-center py-20 text-gray-400 gap-3">
              <FontAwesomeIcon icon={faBox} className="text-[40px] opacity-30" />
              <p className="text-sm">{search ? 'No products match your search' : 'No products in catalog yet'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
