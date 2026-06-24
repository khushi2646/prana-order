'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { _id: string; designNumber: string; category?: string; style?: string; }
interface Substitute { sizeStr: string; availableStock: number; }
interface StockLine {
  shape: string; size: string; colour: string;
  requiredPieces: number; requiredWeight: number;
  availableStock: number; shortfall: number;
  substitutes: Substitute[];
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-[#6b6560]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StockCheckPage() {
  const [products, setProducts]               = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [query, setQuery]                     = useState('');
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [selected, setSelected]               = useState<Product | null>(null);
  const [stockLines, setStockLines]           = useState<StockLine[]>([]);
  const [stockLoading, setStockLoading]       = useState(false);
  const [stockError, setStockError]           = useState<string | null>(null);
  const [checked, setChecked]                 = useState(false);

  useEffect(() => {
    fetch('/api/products?limit=500', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: { products: Product[] }) => setProducts(data.products))
      .finally(() => setProductsLoading(false));
  }, []);

  const fetchStock = useCallback((productId: string) => {
    setStockLoading(true); setStockError(null); setStockLines([]); setChecked(false);
    fetch(`/api/stock-check/${productId}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { message?: string }) => Promise.reject(e.message ?? r.statusText)))
      .then((data: StockLine[]) => { setStockLines(data); setChecked(true); })
      .catch((e: unknown) => setStockError(typeof e === 'string' ? e : 'Failed to load stock data.'))
      .finally(() => setStockLoading(false));
  }, []);

  const handleSelect = (product: Product) => {
    setSelected(product); setQuery(product.designNumber); setDropdownOpen(false); fetchStock(product._id);
  };
  const handleQueryChange = (value: string) => {
    setQuery(value); setDropdownOpen(true);
    if (selected && value !== selected.designNumber) { setSelected(null); setStockLines([]); setChecked(false); }
  };

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selected.designNumber)) return products;
    return products.filter(p =>
      p.designNumber.toLowerCase().includes(q) ||
      (p.category?.toLowerCase().includes(q) ?? false) ||
      (p.style?.toLowerCase().includes(q) ?? false)
    );
  }, [products, query, selected]);

  const totalLines   = stockLines.length;
  const inStockCount = stockLines.filter(l => l.shortfall === 0).length;
  const hasShortfall = stockLines.some(l => l.shortfall > 0);

  const handleExport = () => {
    if (!selected) return;
    const lines = stockLines.filter(l => l.shortfall > 0);
    if (!lines.length) return;
    const title   = `Stock Shortfall — ${selected.designNumber}`;
    const divider = '─'.repeat(52);
    const rows    = lines.map(l => `${l.shape.padEnd(10)}  ${l.size.padEnd(14)}  ${l.colour.padEnd(8)}  Need: ${l.shortfall} pcs`);
    const content = [title, divider, ...rows, divider, `Total: ${lines.length} shortfall item${lines.length !== 1 ? 's' : ''}`].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `shortfall-${selected.designNumber}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Stock Check</h1>
        <p className="text-sm text-[#6b6560] mt-0.5">Check diamond ledger availability against a product&apos;s stone lines</p>
      </div>

      {/* ── Product selector ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] p-5 mb-6">
        <label className="block text-[10px] font-bold text-[#6b6560] uppercase tracking-[0.12em] mb-2">
          Select Product
        </label>
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
          <input
            type="text"
            placeholder={productsLoading ? 'Loading products…' : 'Search by design number, category, style…'}
            value={query} disabled={productsLoading}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a] disabled:bg-[#f8f5f0] disabled:text-[#6b6560]"
          />

          {dropdownOpen && filteredProducts.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-[#ddd5c8] rounded-xl shadow-[0_8px_24px_rgba(26,26,26,0.12)]">
              {filteredProducts.map(p => (
                <button key={p._id} onMouseDown={() => handleSelect(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl ${
                    selected?._id === p._id ? 'bg-brand/8 text-brand' : 'hover:bg-[#f8f5f0] text-[#1a1a1a]'
                  }`}>
                  <span className="font-semibold">{p.designNumber}</span>
                  {(p.category || p.style) && (
                    <span className="text-[#6b6560] text-xs">{[p.category, p.style].filter(Boolean).join(' · ')}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {dropdownOpen && !productsLoading && filteredProducts.length === 0 && query && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-[#ddd5c8] rounded-xl shadow-lg px-4 py-3 text-sm text-[#6b6560]">
              No products match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* ── Loading spinner ──────────────────────────────────────────── */}
      {stockLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────── */}
      {stockError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{stockError}</div>
      )}

      {/* ── No stone lines ───────────────────────────────────────────── */}
      {!stockLoading && !stockError && checked && totalLines === 0 && (
        <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] flex flex-col items-center justify-center h-40 gap-1 text-[#6b6560]">
          <p className="text-sm font-medium">No stone lines on this product.</p>
          <p className="text-xs">Add stone lines on the product detail page first.</p>
        </div>
      )}

      {/* ── Results table ────────────────────────────────────────────── */}
      {!stockLoading && !stockError && totalLines > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">

          {/* Summary bar */}
          <div className="px-5 py-3.5 border-b border-[#f0ebe3] flex items-center justify-between gap-4">
            <p className="text-sm text-[#6b6560]">
              <span className={`font-semibold ${inStockCount === totalLines ? 'text-emerald-600' : 'text-[#1a1a1a]'}`}>
                {inStockCount} of {totalLines}
              </span>{' '}
              stone {totalLines === 1 ? 'type' : 'types'} fully in stock
              {inStockCount === totalLines && (
                <span className="ml-2 text-emerald-600 text-xs font-medium">— All clear</span>
              )}
            </p>
            {hasShortfall && (
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 active:bg-brand/80 transition-colors shrink-0 shadow-sm">
                <DownloadIcon />
                Export Shortfall
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                  {['Shape', 'Size', 'Colour', 'Req. Pcs', 'Req. Wt (ct)', 'In Stock', 'Shortfall'].map((col, i) => (
                    <th key={col} className={`px-5 py-3 text-[11px] font-semibold text-[#6b6560] uppercase tracking-wider ${i >= 3 ? 'text-right' : 'text-left'}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe3]">
                {stockLines.map((line, i) => {
                  const ok       = line.shortfall === 0;
                  const none     = line.availableStock <= 0;
                  const rowCls   = ok ? 'bg-emerald-50/60' : none ? 'bg-red-50/70' : 'bg-orange-50/60';
                  const stockCls = ok ? 'text-emerald-600 font-semibold' : none ? 'text-red-600 font-semibold' : 'text-orange-500 font-semibold';
                  const subs     = line.substitutes ?? [];
                  return (
                    <Fragment key={i}>
                      <tr className={rowCls}>
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#1a1a1a]">{line.shape}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-[#6b6560]">{line.size}</td>
                        <td className="px-5 py-3.5 text-xs text-[#6b6560]">{line.colour}</td>
                        <td className="px-5 py-3.5 text-xs text-right text-[#1a1a1a]">{line.requiredPieces}</td>
                        <td className="px-5 py-3.5 text-xs text-right text-[#1a1a1a]">{line.requiredWeight.toFixed(2)}</td>
                        <td className={`px-5 py-3.5 text-xs text-right ${stockCls}`}>{line.availableStock}</td>
                        <td className="px-5 py-3.5 text-xs text-right">
                          {ok ? (
                            <span className="text-emerald-600 font-bold">✓</span>
                          ) : (
                            <span className={`font-bold ${none ? 'text-red-600' : 'text-orange-500'}`}>−{line.shortfall}</span>
                          )}
                        </td>
                      </tr>
                      {!ok && subs.length > 0 && (
                        <tr className="bg-[#fdf8ee] border-b border-[#f0e4b0]">
                          <td colSpan={7} className="px-5 py-2 pl-10">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-[11px] font-semibold text-[#8a6c1a] shrink-0">Substitutes available:</span>
                              {subs.map((s, j) => (
                                <span key={j} className="inline-flex items-center gap-1 text-[11px] bg-[#fef3c7] border border-[#fde68a] rounded-full px-2.5 py-0.5 text-[#92400e]">
                                  <span className="font-mono font-bold">{line.shape} {s.sizeStr}</span>
                                  <span className="text-[#b45309]">— {s.availableStock} pcs</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
