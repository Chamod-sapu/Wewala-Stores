import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  Layers,
  Upload,
  Download,
  History,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  Tag,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { STORE_CONFIG, Product, Category } from '@wewala/shared';
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal';
import { MovementHistoryModal } from '@/components/inventory/MovementHistoryModal';
import { CategoryManageModal } from '@/components/inventory/CategoryManageModal';
import { ProductFormModal } from '@/components/inventory/ProductFormModal';
import { CsvImportModal } from '@/components/inventory/CsvImportModal';

interface ProductImage {
  url: string;
  sort_order: number;
}

interface ProductWithMeta extends Product {
  categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  product_images?: ProductImage[];
}

type SortColumn = 'name' | 'price' | 'stock' | 'created_at';
type SortDirection = 'asc' | 'desc';
type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function InventoryPage() {
  const { user } = useAdminAuth();
  const [products, setProducts] = useState<ProductWithMeta[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const [csvImportOpen, setCsvImportOpen] = useState(false);

  // Fast toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch Inventory and Categories
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      if (cats) setCategories(cats);

      // 2. Fetch products with joined images and categories
      const { data: prods, error } = await supabase
        .from('products')
        .select('*, product_images(url, sort_order), categories(id, name, slug)')
        .order('name');

      if (error) throw error;
      setProducts((prods as unknown as ProductWithMeta[]) || []);
    } catch (err) {
      console.warn('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Handle Sort
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'name' ? 'asc' : 'desc');
    }
  };

  // Toggle Product Active / Inactive
  const handleToggleActive = async (p: ProductWithMeta) => {
    const newActive = !p.is_active;
    setTogglingId(p.id);

    // Optimistic update
    setProducts((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, is_active: newActive } : item))
    );

    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_active: newActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', p.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Toggle active error:', err);
      // Revert optimistic
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: p.is_active } : item))
      );
      alert(`Could not toggle active status: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Metrics
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.low_stock_threshold).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stock === 0).length,
    [products]
  );
  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q) || false;
        const matchesSlug = p.slug.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesSlug) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
        return false;
      }

      // 3. Stock Status filter
      if (stockStatus === 'in_stock') {
        if (p.stock <= p.low_stock_threshold) return false;
      } else if (stockStatus === 'low_stock') {
        if (p.stock > p.low_stock_threshold || p.stock === 0) return false;
      } else if (stockStatus === 'out_of_stock') {
        if (p.stock !== 0) return false;
      }

      // 4. Active filter
      if (activeFilter === 'active' && !p.is_active) return false;
      if (activeFilter === 'inactive' && p.is_active) return false;

      return true;
    });
  }, [products, search, selectedCategory, stockStatus, activeFilter]);

  // Sorted Products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortColumn) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'price':
          valA = a.price;
          valB = b.price;
          break;
        case 'stock':
          valA = a.stock;
          valB = b.stock;
          break;
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        default:
          valA = a.name;
          valB = b.name;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  // Paginated Products
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, stockStatus, activeFilter]);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      alert('No products available to export.');
      return;
    }

    const headers = [
      'id',
      'name',
      'slug',
      'sku',
      'category_name',
      'price',
      'compare_at_price',
      'stock',
      'low_stock_threshold',
      'is_active',
      'created_at',
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredProducts.map((p) => [
      escapeCSV(p.id),
      escapeCSV(p.name),
      escapeCSV(p.slug),
      escapeCSV(p.sku || ''),
      escapeCSV(p.categories?.name || ''),
      escapeCSV(p.price),
      escapeCSV(p.compare_at_price ?? ''),
      escapeCSV(p.stock),
      escapeCSV(p.low_stock_threshold),
      escapeCSV(p.is_active),
      escapeCSV(p.created_at),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `wewala-inventory-export-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setStockStatus('all');
    setActiveFilter('all');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Inventory & Catalog
            </h1>
            <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
              {products.length} SKUs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock control, catalog images, category hierarchy, and inventory ledger audits
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* New Product */}
          <button
            onClick={() => {
              setEditingProduct(null);
              setProductFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus size={14} />
            <span>New Product</span>
          </button>

          {/* Manage Categories */}
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Layers size={14} />
            <span>Categories</span>
          </button>

          {/* Storewide Audit Ledger */}
          <button
            onClick={() => {
              setHistoryProduct(null);
              setHistoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="View Storewide Inventory Movements"
          >
            <History size={14} />
            <span>Audit Ledger</span>
          </button>

          {/* CSV Import */}
          <button
            onClick={() => setCsvImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Catalog Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Total Stock Units */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Warehouse Units
            </span>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              {totalUnits.toLocaleString()}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <Boxes size={20} />
          </div>
        </div>

        {/* Low-Stock Warning Button Filter */}
        <button
          onClick={() =>
            setStockStatus((prev) => (prev === 'low_stock' ? 'all' : 'low_stock'))
          }
          className={`rounded-2xl border p-4 shadow-sm text-left transition flex items-center justify-between ${
            stockStatus === 'low_stock'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500/40'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Low-Stock SKUs
            </span>
            <p
              className={`mt-1 text-2xl font-black ${
                lowStockCount > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
              }`}
            >
              {lowStockCount}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <AlertTriangle size={20} />
          </div>
        </button>

        {/* Out of Stock Button Filter */}
        <button
          onClick={() =>
            setStockStatus((prev) => (prev === 'out_of_stock' ? 'all' : 'out_of_stock'))
          }
          className={`rounded-2xl border p-4 shadow-sm text-left transition flex items-center justify-between ${
            stockStatus === 'out_of_stock'
              ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-500/40'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Out of Stock
            </span>
            <p
              className={`mt-1 text-2xl font-black ${
                outOfStockCount > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
              }`}
            >
              {outOfStockCount}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <XCircle size={20} />
          </div>
        </button>

        {/* In Stock Count */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Healthy Stock SKUs
            </span>
            <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {products.length - lowStockCount - outOfStockCount}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or slug..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 pl-9 pr-8 text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
              <Layers size={13} className="text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
              <span className="text-slate-400 font-bold">Stock:</span>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as StockStatusFilter)}
                className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="in_stock">In Stock Only</option>
                <option value="low_stock">Low Stock (≤ Threshold)</option>
                <option value="out_of_stock">Out of Stock (0 units)</option>
              </select>
            </div>

            {/* Active / Inactive Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
              <span className="text-slate-400 font-bold">Visibility:</span>
              <select
                value={activeFilter}
                onChange={(e) =>
                  setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')
                }
                className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Visibility</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive / Draft</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(search ||
              selectedCategory !== 'all' ||
              stockStatus !== 'all' ||
              activeFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin text-brand-500 mx-auto" size={32} />
            <p className="mt-3 text-xs text-slate-500 font-semibold">
              Loading warehouse catalog...
            </p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Boxes size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No products found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No inventory items match your search or filter configuration.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 px-3 py-1.5 text-xs font-bold hover:bg-brand-100 transition"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider select-none">
                  {/* Thumbnail */}
                  <th className="py-3 px-4 w-16">Item</th>

                  {/* Product Name & SKU */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Product Title & SKU</span>
                      {sortColumn === 'name' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        ))}
                    </div>
                  </th>

                  {/* Category */}
                  <th className="py-3 px-4">Category</th>

                  {/* Price */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 text-right"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Price</span>
                      {sortColumn === 'price' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        ))}
                    </div>
                  </th>

                  {/* Stock Quantity */}
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 text-center"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Stock Units</span>
                      {sortColumn === 'stock' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        ))}
                    </div>
                  </th>

                  {/* Status Badges */}
                  <th className="py-3 px-4 text-center">Stock Status</th>

                  {/* Visibility Toggle */}
                  <th className="py-3 px-4 text-center">Catalog Status</th>

                  {/* Actions */}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.map((p) => {
                  const sortedImgs = [...(p.product_images || [])].sort(
                    (a, b) => a.sort_order - b.sort_order
                  );
                  const primaryImgUrl = sortedImgs[0]?.url;

                  const isOut = p.stock === 0;
                  const isLow = p.stock > 0 && p.stock <= p.low_stock_threshold;
                  const isHealthy = p.stock > p.low_stock_threshold;

                  const isToggling = togglingId === p.id;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center shrink-0">
                          {primaryImgUrl ? (
                            <img
                              src={primaryImgUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                          )}
                        </div>
                      </td>

                      {/* Title & SKU */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <p className="font-bold text-slate-900 dark:text-white hover:text-brand-600 transition cursor-pointer"
                          onClick={() => {
                            setEditingProduct(p);
                            setProductFormOpen(true);
                          }}
                        >
                          {p.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-400">
                          <span>SKU: {p.sku || 'N/A'}</span>
                          <span>•</span>
                          <span>/{p.slug}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        {p.categories?.name ? (
                          <span className="inline-block rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {p.categories.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Uncategorized</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right">
                        <p className="font-black text-slate-900 dark:text-white">
                          {STORE_CONFIG.currencySymbol} {Number(p.price).toLocaleString()}
                        </p>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <p className="text-[10px] text-slate-400 line-through">
                            {STORE_CONFIG.currencySymbol}{' '}
                            {Number(p.compare_at_price).toLocaleString()}
                          </p>
                        )}
                      </td>

                      {/* Stock Units & Quick Increments */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-black text-sm ${
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (min {p.low_stock_threshold})
                          </span>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
                            <XCircle size={11} /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={11} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={11} /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Visibility Activate/Deactivate Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                          title={p.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                        >
                          {p.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{p.is_active ? 'Active' : 'Draft / Off'}</span>
                        </button>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Adjust Button */}
                          <button
                            onClick={() => {
                              setSelectedProductForAdjust(p);
                              setStockModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            title="Quick Stock Adjustment & Ledger Note"
                          >
                            <RotateCcw size={12} className="text-brand-500" />
                            <span>Adjust</span>
                          </button>

                          {/* Movement History */}
                          <button
                            onClick={() => {
                              setHistoryProduct(p);
                              setHistoryModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                            title="View Inventory Movement Audit History"
                          >
                            <History size={15} />
                          </button>

                          {/* Edit Product */}
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setProductFormOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 transition"
                            title="Edit Product Details & Gallery"
                          >
                            <Edit2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && sortedProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 p-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                Showing{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {Math.min(currentPage * pageSize, sortedProducts.length)}
                </strong>{' '}
                of{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {sortedProducts.length}
                </strong>{' '}
                products
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-0.5 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                title="First Page"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft size={13} /> Prev
              </button>

              <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1"
              >
                Next <ChevronRight size={13} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-2 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stock Adjust Modal */}
      <StockAdjustModal
        product={selectedProductForAdjust}
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        onSuccess={fetchInventory}
      />

      {/* Product Create / Edit Modal */}
      <ProductFormModal
        product={editingProduct}
        categories={categories}
        isOpen={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        onSuccess={fetchInventory}
        onManageCategories={() => setCategoryModalOpen(true)}
      />

      {/* Category Management Modal */}
      <CategoryManageModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCategoriesUpdated={fetchInventory}
      />

      {/* Inventory Movement Audit History Modal */}
      <MovementHistoryModal
        product={historyProduct}
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        categories={categories}
        isOpen={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onSuccess={fetchInventory}
      />
    </div>
  );
}
