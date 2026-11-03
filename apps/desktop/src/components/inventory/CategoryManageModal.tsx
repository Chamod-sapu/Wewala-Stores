import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Edit2, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Category } from '@wewala/shared';

interface CategoryWithCount extends Category {
  product_count?: number;
}

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated: () => void;
}

export const CategoryManageModal: React.FC<CategoryManageModalProps> = ({
  isOpen,
  onClose,
  onCategoriesUpdated,
}) => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Category Form
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data: cats, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      // Also get counts from products
      const { data: prods } = await supabase.from('products').select('category_id');
      const countsMap: Record<string, number> = {};
      (prods || []).forEach((p) => {
        if (p.category_id) {
          countsMap[p.category_id] = (countsMap[p.category_id] || 0) + 1;
        }
      });

      const list = (cats || []).map((c) => ({
        ...c,
        product_count: countsMap[c.id] || 0,
      }));

      setCategories(list);
    } catch (err: any) {
      console.warn('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setIsAdding(false);
      setEditingId(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      setSlug(generateSlug(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }
    const safeSlug = slug.trim() || generateSlug(name);

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            slug: safeSlug,
            description: description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from('categories').insert({
          name: name.trim(),
          slug: safeSlug,
          description: description.trim() || null,
          is_active: true,
        });

        if (error) throw error;
      }

      setIsAdding(false);
      setEditingId(null);
      setName('');
      setSlug('');
      setDescription('');
      await fetchCategories();
      onCategoriesUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setIsAdding(true);
  };

  const handleDelete = async (cat: CategoryWithCount) => {
    if ((cat.product_count || 0) > 0) {
      alert(
        `Cannot delete "${cat.name}" because it currently has ${cat.product_count} active product(s) linked to it. Reassign those products first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) throw error;
      await fetchCategories();
      onCategoriesUpdated();
    } catch (err: any) {
      alert(`Could not delete category: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Category Management
              </h3>
              <p className="text-xs text-slate-500">Create, rename, and organize store catalog taxonomy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Add/Edit Category Form Card */}
        {isAdding ? (
          <form
            onSubmit={handleSave}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {editingId ? 'Edit Category' : 'Create New Category'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Beverages & Drinks"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., beverages-drinks"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short department overview..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="rounded-lg border px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-1.5 font-bold text-white shadow-sm hover:bg-brand-700 transition"
              >
                {submitting && <Loader2 size={12} className="animate-spin" />}
                {editingId ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-semibold">
              {categories.length} Registered Categories
            </span>
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setName('');
                setSlug('');
                setDescription('');
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
            >
              <Plus size={13} /> Add Category
            </button>
          </div>
        )}

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-2 text-brand-500" size={22} />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No categories configured yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">/{c.slug}</span>
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {c.product_count} products
                    </span>

                    <button
                      onClick={() => handleEdit(c)}
                      className="rounded-lg p-1 text-slate-400 hover:text-brand-600 transition"
                      title="Edit Category"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="rounded-lg p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

