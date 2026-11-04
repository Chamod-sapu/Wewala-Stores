import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  DollarSign,
  Package,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Category, Product, STORE_CONFIG } from '@wewala/shared';

interface ProductImageItem {
  id?: string;
  url: string;
  sort_order: number;
  isNew?: boolean;
  file?: File;
}

interface ProductFormModalProps {
  product: Product | null; // null for Create, Product for Edit
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onManageCategories: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSuccess,
  onManageCategories,
}) => {
  const { user } = useAdminAuth();
  const isEditing = Boolean(product);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Images state
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate data when editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setSku(product.sku || '');
      setCategoryId(product.category_id || '');
      setDescription(product.description || '');
      setPrice(product.price);
      setCompareAtPrice(product.compare_at_price ?? '');
      setStock(product.stock);
      setLowStockThreshold(product.low_stock_threshold);
      setIsActive(product.is_active);

      // Load existing images
      const loadImages = async () => {
        const { data } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', product.id)
          .order('sort_order', { ascending: true });

        if (data) {
          setImages(
            data.map((img) => ({
              id: img.id,
              url: img.url,
              sort_order: img.sort_order,
            }))
          );
        }
      };
      loadImages();
    } else {
      // Defaults for Create
      setName('');
      setSlug('');
      setSku('');
      setCategoryId(categories[0]?.id || '');
      setDescription('');
      setPrice('');
      setCompareAtPrice('');
      setStock(10);
      setLowStockThreshold(5);
      setIsActive(true);
      setImages([]);
    }
    setErrorMsg(null);
  }, [product, categories, isOpen]);

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
    if (!isEditing) {
      setSlug(generateSlug(val));
    }
  };

  // Image Upload handler (to Supabase Storage 'product-images' bucket)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);

    const newImages: ProductImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `catalog/${Date.now()}_${i}_${cleanName}.${ext}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newImages.push({
          url: publicData.publicUrl,
          sort_order: images.length + newImages.length,
          isNew: true,
        });
      } catch (err: any) {
        console.error('Image upload failed:', err);
        setErrorMsg(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setIsUploading(false);
    e.target.value = '';
  };

  const handleAddManualUrl = () => {
    if (!manualImageUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        url: manualImageUrl.trim(),
        sort_order: prev.length,
        isNew: true,
      },
    ]);
    setManualImageUrl('');
  };

  // Reorder images (move left/right)
  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= images.length) return;

    const updated = [...images];
    const temp = updated[idx];
    updated[idx] = updated[newIdx];
    updated[newIdx] = temp;

    // Resync sort_order
    setImages(updated.map((img, i) => ({ ...img, sort_order: i })));
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) =>
      prev.filter((_, i) => i !== idx).map((img, i) => ({ ...img, sort_order: i }))
    );
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (price === '' || Number(price) <= 0) {
      setErrorMsg('Retail Price must be greater than 0.');
      return;
    }

    const numPrice = Number(price);
    const numStock = Number(stock);
    const numThreshold = Number(lowStockThreshold);
    const parsedCompare =
      compareAtPrice !== '' && Number(compareAtPrice) > 0 ? Number(compareAtPrice) : null;

    if (numStock < 0) {
      setErrorMsg('Stock cannot be negative.');
      return;
    }
    if (numThreshold < 0) {
      setErrorMsg('Low stock threshold cannot be negative.');
      return;
    }
    if (parsedCompare !== null && parsedCompare < numPrice) {
      setErrorMsg(
        `Original Price (${STORE_CONFIG.currencySymbol} ${parsedCompare}) cannot be lower than Retail Price (${STORE_CONFIG.currencySymbol} ${numPrice}). Leave Original Price empty if this product is not on sale.`
      );
      return;
    }

    const safeSlug = slug.trim() || generateSlug(name);
    setSubmitting(true);
    setErrorMsg(null);

    try {
      let productId = product?.id;

      if (isEditing && productId && product) {
        // Update product
        const { error: prodErr } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            slug: safeSlug,
            sku: sku.trim() || null,
            category_id: categoryId || null,
            description: description.trim() || null,
            price: numPrice,
            compare_at_price: parsedCompare,
            stock: numStock,
            low_stock_threshold: numThreshold,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);

        if (prodErr) throw prodErr;

        // If stock changed, record adjustment
        if (product.stock !== numStock) {
          const delta = numStock - product.stock;
          await supabase.from('inventory_movements').insert({
            product_id: productId,
            change: delta,
            reason: 'Manual Product Edit Update',
            created_by: user?.id || null,
          });
        }
      } else {
        // Create new product
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert({
            name: name.trim(),
            slug: safeSlug,
            sku: sku.trim() || null,
            category_id: categoryId || null,
            description: description.trim() || null,
            price: numPrice,
            compare_at_price: parsedCompare,
            stock: numStock,
            low_stock_threshold: numThreshold,
            is_active: isActive,
          })
          .select('id')
          .single();

        if (prodErr) throw prodErr;
        productId = newProd.id;

        // Record initial stock intake
        if (numStock > 0) {
          await supabase.from('inventory_movements').insert({
            product_id: productId,
            change: numStock,
            reason: 'Initial Product Inventory Intake',
            created_by: user?.id || null,
          });
        }
      }

      // Sync Product Images
      if (productId) {
        // Delete old image rows for this product
        await supabase.from('product_images').delete().eq('product_id', productId);

        // Insert updated images with updated sort_order
        if (images.length > 0) {
          const imageRows = images.map((img, i) => ({
            product_id: productId,
            url: img.url,
            sort_order: i,
          }));

          const { error: imgErr } = await supabase
            .from('product_images')
            .insert(imageRows);

          if (imgErr) console.warn('Error saving images:', imgErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setErrorMsg(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Package size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isEditing ? 'Edit Product' : 'Create New Product'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure SKU specifications, pricing, stock thresholds, and gallery images
              </p>
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs">
          {/* 1. Basic Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1">
              General Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Premium Ceylon Black Tea 500g"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Slug (URL Path) *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., premium-ceylon-black-tea-500g"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g., TEA-CEY-500"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={onManageCategories}
                    className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    + Manage Categories
                  </button>
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="">No Category Selected</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detailed customer specifications, ingredients, or usage instructions..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* 2. Pricing & Inventory */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1">
              Pricing & Stock Levels
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Retail Price ({STORE_CONFIG.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2450.00"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Original Price ({STORE_CONFIG.currencySymbol})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={compareAtPrice}
                  onChange={(e) =>
                    setCompareAtPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="2900.00"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Original MSRP strikethrough (must be ≥ Retail Price, or leave blank)
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Stock Units *
                </label>
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-black focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Low-Stock Threshold
                </label>
                <input
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) =>
                    setLowStockThreshold(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active_toggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label
                htmlFor="is_active_toggle"
                className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
              >
                Product is Active (Visible in Storefront Catalog)
              </label>
            </div>
          </div>

          {/* 3. Product Gallery & Drag-to-Reorder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
                Product Image Gallery ({images.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                First image is designated as primary thumbnail
              </span>
            </div>

            {/* Upload Area */}
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 p-4 text-center">
              <input
                type="file"
                id="multi_image_input"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="multi_image_input"
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin text-brand-600" />
                ) : (
                  <Upload size={14} />
                )}
                <span>Upload Images to product-images Bucket</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1.5">
                PNG, JPG, WebP supported. Multiple files can be selected simultaneously.
              </p>

              {/* Or manual URL */}
              <div className="mt-3 flex items-center justify-center gap-2 max-w-md mx-auto">
                <input
                  type="url"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  placeholder="Or paste external image URL..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddManualUrl}
                  className="rounded-lg bg-slate-200 dark:bg-slate-800 px-3 py-1 font-bold hover:bg-slate-300 transition"
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Reorderable Image Cards */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id || img.url}
                    className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-sm flex flex-col justify-between"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                      <img
                        src={img.url}
                        alt={`Product image ${idx + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 rounded bg-brand-600 text-white px-1.5 py-0.5 text-[9px] font-black uppercase shadow">
                          Thumbnail
                        </span>
                      )}
                    </div>

                    {/* Reorder & Delete Controls */}
                    <div className="mt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'left')}
                          disabled={idx === 0}
                          className="rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20"
                          title="Move Left (Higher Priority)"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'right')}
                          disabled={idx === images.length - 1}
                          className="rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20"
                          title="Move Right"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Remove image"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isUploading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 py-2 font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
