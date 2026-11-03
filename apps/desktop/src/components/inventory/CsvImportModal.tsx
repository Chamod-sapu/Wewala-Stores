import React, { useState } from 'react';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Category, STORE_CONFIG } from '@wewala/shared';

interface ParsedProductRow {
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_threshold: number;
  description: string;
  is_active: boolean;
  isValid: boolean;
  validationError?: string;
}

interface CsvImportModalProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  categories,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAdminAuth();
  const [rows, setRows] = useState<ParsedProductRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; failed: number } | null>(
    null
  );

  if (!isOpen) return null;

  // 1. Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      'name',
      'slug',
      'sku',
      'category',
      'price',
      'compare_at_price',
      'stock',
      'low_stock_threshold',
      'description',
      'is_active',
    ];
    const sampleRows = [
      [
        'Pure Organic Green Tea 100g',
        'pure-organic-green-tea-100g',
        'TEA-GRN-100',
        categories[0]?.name || 'Beverages',
        '1450.00',
        '1600.00',
        '25',
        '5',
        'Fresh handpicked Ceylon green tea leaves',
        'true',
      ],
      [
        'Roasted Cashew Nuts 250g',
        'roasted-cashew-nuts-250g',
        'NUT-CSH-250',
        categories[1]?.name || 'Snacks',
        '2200.00',
        '',
        '18',
        '4',
        'Salted and slow roasted jumbo cashews',
        'true',
      ],
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'wewala-product-import-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Parse uploaded CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setIsParsing(false);
        return;
      }

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        alert('CSV file must have a header row and at least 1 data row.');
        setIsParsing(false);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

      const parsed: ParsedProductRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple CSV splitter handling quotes
        const rawValues = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const values = rawValues.map((v) => v.trim().replace(/^"|"$/g, ''));

        const getVal = (colName: string) => {
          const idx = headers.indexOf(colName);
          return idx >= 0 && idx < values.length ? values[idx] : '';
        };

        const name = getVal('name');
        const slug =
          getVal('slug') ||
          name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        const sku = getVal('sku');
        const category = getVal('category');
        const price = parseFloat(getVal('price'));
        const compare_at = parseFloat(getVal('compare_at_price'));
        const stock = parseInt(getVal('stock'), 10);
        const threshold = parseInt(getVal('low_stock_threshold'), 10) || 5;
        const description = getVal('description');
        const is_active = getVal('is_active').toLowerCase() !== 'false';

        let isValid = true;
        let validationError = '';

        if (!name) {
          isValid = false;
          validationError = 'Missing name';
        } else if (isNaN(price) || price <= 0) {
          isValid = false;
          validationError = 'Invalid price';
        } else if (isNaN(stock) || stock < 0) {
          isValid = false;
          validationError = 'Invalid stock';
        }

        parsed.push({
          name,
          slug,
          sku,
          category,
          price: isNaN(price) ? 0 : price,
          compare_at_price: isNaN(compare_at) ? null : compare_at,
          stock: isNaN(stock) ? 0 : stock,
          low_stock_threshold: threshold,
          description,
          is_active,
          isValid,
          validationError,
        });
      }

      setRows(parsed);
      setIsParsing(false);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // 3. Commit Import to Supabase
  const handleExecuteImport = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    let importedCount = 0;
    let failedCount = 0;

    // Build category map
    const catMap: Record<string, string> = {};
    categories.forEach((c) => {
      catMap[c.name.toLowerCase()] = c.id;
      catMap[c.slug.toLowerCase()] = c.id;
    });

    for (const row of validRows) {
      try {
        let catId = catMap[row.category.toLowerCase()] || null;

        // If category specified but doesn't exist, try to create it
        if (!catId && row.category.trim()) {
          const catSlug = row.category
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-');
          const { data: newCat } = await supabase
            .from('categories')
            .insert({
              name: row.category.trim(),
              slug: catSlug,
              is_active: true,
            })
            .select('id')
            .single();

          if (newCat) {
            catId = newCat.id;
            catMap[row.category.toLowerCase()] = newCat.id;
          }
        }

        // Insert product
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .insert({
            name: row.name,
            slug: row.slug,
            sku: row.sku || null,
            category_id: catId,
            price: row.price,
            compare_at_price: row.compare_at_price,
            stock: row.stock,
            low_stock_threshold: row.low_stock_threshold,
            description: row.description || null,
            is_active: row.is_active,
          })
          .select('id')
          .single();

        if (prodErr) throw prodErr;

        // Write inventory movement
        if (prod && row.stock > 0) {
          await supabase.from('inventory_movements').insert({
            product_id: prod.id,
            change: row.stock,
            reason: 'CSV Bulk Catalog Import',
            created_by: user?.id || null,
          });
        }

        importedCount++;
      } catch (err) {
        console.error('Row import error:', err);
        failedCount++;
      }
    }

    setIsImporting(false);
    setImportSummary({ imported: importedCount, failed: failedCount });
    if (importedCount > 0) {
      onSuccess();
    }
  };

  const validCount = rows.filter((r) => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Bulk Import Products via CSV
              </h3>
              <p className="text-xs text-slate-500">
                Upload a spreadsheet of items with inventory counts, SKUs, and categories
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

        {/* Upload & Template Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-xs">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Need the spreadsheet format?
            </p>
            <p className="text-slate-500 mt-0.5">
              Download our ready-made CSV template with headers and example items.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
            >
              <Download size={13} />
              <span>Download Template</span>
            </button>

            <input
              type="file"
              id="csv_file_input"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="csv_file_input"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 font-bold text-white shadow-sm cursor-pointer transition"
            >
              <Upload size={13} />
              <span>{fileName ? 'Choose Another CSV' : 'Upload CSV File'}</span>
            </label>
          </div>
        </div>

        {/* Import Summary Banner */}
        {importSummary && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Successfully imported {importSummary.imported} product(s)!
              {importSummary.failed > 0 && ` (${importSummary.failed} failed)`}
            </span>
            <button
              onClick={onClose}
              className="font-bold underline hover:text-emerald-800"
            >
              Done & View Inventory
            </button>
          </div>
        )}

        {/* Preview Table */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
          {isParsing ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Loader2 className="animate-spin text-brand-500 mx-auto mb-2" size={24} />
              Parsing CSV file...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Upload a valid .csv file above to preview products before importing.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 text-slate-400 uppercase text-[10px] font-bold">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                      !row.isValid ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                          <CheckCircle2 size={12} /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[10px]">
                          <AlertTriangle size={12} /> {row.validationError}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {row.name || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {row.sku || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {row.category || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {STORE_CONFIG.currencySymbol} {row.price.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{row.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500">
            {rows.length > 0 && (
              <>
                Ready to import <strong className="text-emerald-600">{validCount}</strong> valid of{' '}
                {rows.length} total rows
              </>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={validCount === 0 || isImporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 py-2 font-bold text-white shadow-sm transition disabled:opacity-50"
            >
              {isImporting && <Loader2 size={13} className="animate-spin" />}
              Commit {validCount} Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

