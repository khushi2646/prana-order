'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'product' | 'order';

interface Product { _id: string; designNumber: string; category?: string; style?: string; }
interface Substitute { sizeStr: string; availableStock: number; }
interface StockLine {
  shape: string; size: string; colour: string;
  requiredPieces: number; requiredWeight: number;
  availableStock: number; shortfall: number;
  substitutes: Substitute[];
}

interface OrderStoneLine {
  shape?: string; size?: string; colour?: string;
  piecesPerUnit?: number; totalPieces?: number;
}
interface OrderProduct {
  productCode: string;
  productRef?: string | null;
  stoneLines?: OrderStoneLine[];
}
interface Order {
  _id: string; orderId: string; customerName: string;
  products: OrderProduct[];
}

interface OrderStockLine {
  shape: string; size: string; colour: string;
  totalRequired: number; availableStock: number; shortfall: number;
  refs: { productCode: string; pieces: number }[];
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

  // ── Mode ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('product');

  // ── Product mode state ───────────────────────────────────────────────
  const [products, setProducts]               = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [query, setQuery]                     = useState('');
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [selected, setSelected]               = useState<Product | null>(null);
  const [stockLines, setStockLines]           = useState<StockLine[]>([]);
  const [stockLoading, setStockLoading]       = useState(false);
  const [stockError, setStockError]           = useState<string | null>(null);
  const [checked, setChecked]                 = useState(false);

  // ── Order mode state ─────────────────────────────────────────────────
  const [ordersData, setOrdersData]               = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading]         = useState(false);
  const [orderQuery, setOrderQuery]               = useState('');
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder]         = useState<Order | null>(null);
  const [orderStockLines, setOrderStockLines]     = useState<OrderStockLine[]>([]);
  const [orderStockLoading, setOrderStockLoading] = useState(false);
  const [orderStockError, setOrderStockError]     = useState<string | null>(null);
  const [orderChecked, setOrderChecked]           = useState(false);

  // ── Fetch products (always, for product mode) ────────────────────────
  useEffect(() => {
    fetch('/api/products?limit=500', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: { products: Product[] }) => setProducts(data.products))
      .finally(() => setProductsLoading(false));
  }, []);

  // ── Fetch orders when mode switches to 'order' ───────────────────────
  useEffect(() => {
    if (mode !== 'order') return;
    setOrdersLoading(true);
    fetch('/api/orders', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Order[]) => setOrdersData(Array.isArray(data) ? data : []))
      .catch(() => setOrdersData([]))
      .finally(() => setOrdersLoading(false));
  }, [mode]);

  // ── Product mode: fetch stock for a single product ───────────────────
  const fetchStock = useCallback((productId: string) => {
    setStockLoading(true); setStockError(null); setStockLines([]); setChecked(false);
    fetch(`/api/stock-check/${productId}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { message?: string }) => Promise.reject(e.message ?? r.statusText)))
      .then((data: StockLine[]) => { setStockLines(data); setChecked(true); })
      .catch((e: unknown) => setStockError(typeof e === 'string' ? e : 'Failed to load stock data.'))
      .finally(() => setStockLoading(false));
  }, []);

  // ── Order mode: aggregate + check stock ─────────────────────────────
  const fetchOrderStock = useCallback(async (order: Order) => {
    setOrderStockLoading(true);
    setOrderStockError(null);
    setOrderStockLines([]);
    setOrderChecked(false);
    try {
      // 1. Aggregate stone lines across all products, grouped by shape+size+colour
      const groupMap = new Map<string, {
        shape: string; size: string; colour: string;
        totalRequired: number;
        refs: { productCode: string; pieces: number }[];
      }>();

      for (const product of order.products) {
        for (const sl of product.stoneLines ?? []) {
          if (!sl.shape && !sl.size) continue;
          const key = `${sl.shape ?? ''}|${sl.size ?? ''}|${sl.colour ?? ''}`;
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              shape: sl.shape ?? '', size: sl.size ?? '', colour: sl.colour ?? '',
              totalRequired: 0, refs: [],
            });
          }
          const g   = groupMap.get(key)!;
          const pcs = sl.totalPieces ?? 0;
          g.totalRequired += pcs;
          if (pcs > 0) g.refs.push({ productCode: product.productCode, pieces: pcs });
        }
      }

      if (groupMap.size === 0) {
        setOrderChecked(true);
        return;
      }

      // 2. Fetch stock check for each unique productRef → build ledger availability map
      const refs = [...new Set(
        order.products.map(p => p.productRef).filter((r): r is string => !!r)
      )];

      const ledgerMap = new Map<string, number>(); // key → availableStock

      if (refs.length > 0) {
        const results = await Promise.all(
          refs.map(ref =>
            fetch(`/api/stock-check/${ref}`)
              .then(r => r.ok ? (r.json() as Promise<StockLine[]>) : ([] as StockLine[]))
              .catch(() => [] as StockLine[])
          )
        );
        for (const lines of results) {
          for (const line of lines) {
            const key = `${line.shape}|${line.size}|${line.colour}`;
            if (!ledgerMap.has(key)) ledgerMap.set(key, line.availableStock);
          }
        }
      }

      // 3. Build final OrderStockLine[]
      const result: OrderStockLine[] = [];
      for (const [key, g] of groupMap.entries()) {
        const available = ledgerMap.get(key) ?? 0;
        const shortfall = Math.max(0, g.totalRequired - available);
        result.push({
          shape: g.shape, size: g.size, colour: g.colour,
          totalRequired: g.totalRequired,
          availableStock: available,
          shortfall,
          refs: g.refs,
        });
      }

      setOrderStockLines(result);
      setOrderChecked(true);
    } catch (e) {
      setOrderStockError(typeof e === 'string' ? e : 'Failed to check stock for this order.');
    } finally {
      setOrderStockLoading(false);
    }
  }, []);

  // ── Product mode handlers ────────────────────────────────────────────
  const handleSelect = (product: Product) => {
    setSelected(product); setQuery(product.designNumber); setDropdownOpen(false); fetchStock(product._id);
  };
  const handleQueryChange = (value: string) => {
    setQuery(value); setDropdownOpen(true);
    if (selected && value !== selected.designNumber) { setSelected(null); setStockLines([]); setChecked(false); }
  };

  // ── Order mode handlers ──────────────────────────────────────────────
  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order); setOrderQuery(order.orderId); setOrderDropdownOpen(false);
    fetchOrderStock(order);
  };
  const handleOrderQueryChange = (value: string) => {
    setOrderQuery(value); setOrderDropdownOpen(true);
    if (selectedOrder && value !== selectedOrder.orderId) {
      setSelectedOrder(null); setOrderStockLines([]); setOrderChecked(false);
    }
  };

  // ── Memos ────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selected.designNumber)) return products;
    return products.filter(p =>
      p.designNumber.toLowerCase().includes(q) ||
      (p.category?.toLowerCase().includes(q) ?? false) ||
      (p.style?.toLowerCase().includes(q) ?? false)
    );
  }, [products, query, selected]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    if (!q || (selectedOrder && orderQuery === selectedOrder.orderId)) return ordersData;
    return ordersData.filter(o =>
      o.orderId.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q)
    );
  }, [ordersData, orderQuery, selectedOrder]);

  // ── Derived: product mode ────────────────────────────────────────────
  const totalLines   = stockLines.length;
  const inStockCount = stockLines.filter(l => l.shortfall === 0).length;
  const hasShortfall = stockLines.some(l => l.shortfall > 0);

  // ── Derived: order mode ──────────────────────────────────────────────
  const orderTotalLines   = orderStockLines.length;
  const orderInStockCount = orderStockLines.filter(l => l.shortfall === 0).length;
  const orderHasShortfall = orderStockLines.some(l => l.shortfall > 0);

  // ── Exports ──────────────────────────────────────────────────────────
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

  const handleOrderExport = () => {
    if (!selectedOrder) return;
    const lines = orderStockLines.filter(l => l.shortfall > 0);
    if (!lines.length) return;
    const title   = `Stock Shortfall — Order ${selectedOrder.orderId} (${selectedOrder.customerName})`;
    const divider = '─'.repeat(60);
    const rows    = lines.map(l => {
      const refStr = l.refs.map(r => r.productCode).join(', ');
      return `${l.shape.padEnd(10)}  ${l.size.padEnd(14)}  ${l.colour.padEnd(8)}  Need: ${l.shortfall} pcs  [${refStr}]`;
    });
    const content = [title, divider, ...rows, divider, `Total: ${lines.length} shortfall item${lines.length !== 1 ? 's' : ''}`].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `shortfall-${selectedOrder.orderId}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Stock Check</h1>
        <p className="text-sm text-[#6b6560] mt-0.5">Check diamond ledger availability against a product&apos;s stone lines</p>
      </div>

      {/* ── Mode toggle ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {(['product', 'order'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              mode === m
                ? 'bg-[#456158] text-white'
                : 'bg-white border border-[#ddd5c8] text-[#6b6560] hover:bg-[#f8f5f0]'
            }`}
          >
            {m === 'product' ? 'By Product' : 'By Order'}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          BY PRODUCT MODE
      ════════════════════════════════════════════════════════════════ */}
      {mode === 'product' && (
        <>
          {/* Product selector */}
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

          {stockLoading && (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {stockError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{stockError}</div>
          )}
          {!stockLoading && !stockError && checked && totalLines === 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] flex flex-col items-center justify-center h-40 gap-1 text-[#6b6560]">
              <p className="text-sm font-medium">No stone lines on this product.</p>
              <p className="text-xs">Add stone lines on the product detail page first.</p>
            </div>
          )}
          {!stockLoading && !stockError && totalLines > 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
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
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          BY ORDER MODE
      ════════════════════════════════════════════════════════════════ */}
      {mode === 'order' && (
        <>
          {/* Order selector */}
          <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] p-5 mb-6">
            <label className="block text-[10px] font-bold text-[#6b6560] uppercase tracking-[0.12em] mb-2">
              Select Order
            </label>
            <div className="relative max-w-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
              <input
                type="text"
                placeholder={ordersLoading ? 'Loading orders…' : 'Search by order number or customer name…'}
                value={orderQuery} disabled={ordersLoading}
                onChange={e => handleOrderQueryChange(e.target.value)}
                onFocus={() => setOrderDropdownOpen(true)}
                onBlur={() => setTimeout(() => setOrderDropdownOpen(false), 150)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a] disabled:bg-[#f8f5f0] disabled:text-[#6b6560]"
              />

              {orderDropdownOpen && filteredOrders.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-[#ddd5c8] rounded-xl shadow-[0_8px_24px_rgba(26,26,26,0.12)]">
                  {filteredOrders.map(o => (
                    <button key={o._id} onMouseDown={() => handleOrderSelect(o)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl ${
                        selectedOrder?._id === o._id ? 'bg-brand/8 text-brand' : 'hover:bg-[#f8f5f0] text-[#1a1a1a]'
                      }`}>
                      <span className="font-semibold">{o.orderId}</span>
                      <span className="text-[#6b6560] text-xs">{o.customerName}</span>
                      <span className="text-[#6b6560] text-xs ml-auto">
                        ({o.products.length} product{o.products.length !== 1 ? 's' : ''})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {orderDropdownOpen && !ordersLoading && filteredOrders.length === 0 && orderQuery && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-[#ddd5c8] rounded-xl shadow-lg px-4 py-3 text-sm text-[#6b6560]">
                  No orders match &ldquo;{orderQuery}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* No order selected */}
          {!selectedOrder && !orderStockLoading && !orderStockError && (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] flex items-center justify-center h-40">
              <p className="text-sm text-[#6b6560]">Select an order to check its diamond requirements</p>
            </div>
          )}

          {/* Loading */}
          {orderStockLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6b6560]">Checking stock…</p>
            </div>
          )}

          {/* Error */}
          {orderStockError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{orderStockError}</div>
          )}

          {/* No stone lines on this order */}
          {!orderStockLoading && !orderStockError && orderChecked && orderTotalLines === 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] flex flex-col items-center justify-center h-40 gap-1 text-[#6b6560]">
              <p className="text-sm font-medium">No diamond requirements logged for this order yet.</p>
              <p className="text-xs">Add stone lines to products in this order first.</p>
            </div>
          )}

          {/* Results */}
          {!orderStockLoading && !orderStockError && orderTotalLines > 0 && (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#f0ebe3] flex items-center justify-between gap-4">
                <p className="text-sm text-[#6b6560]">
                  <span className={`font-semibold ${orderInStockCount === orderTotalLines ? 'text-emerald-600' : 'text-[#1a1a1a]'}`}>
                    {orderInStockCount} of {orderTotalLines}
                  </span>{' '}
                  stone {orderTotalLines === 1 ? 'type' : 'types'} fully in stock
                  {orderInStockCount === orderTotalLines && (
                    <span className="ml-2 text-emerald-600 text-xs font-medium">
                      — All diamond requirements for this order are in stock
                    </span>
                  )}
                </p>
                {orderHasShortfall && (
                  <button onClick={handleOrderExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 active:bg-brand/80 transition-colors shrink-0 shadow-sm">
                    <DownloadIcon />
                    Export Shortfall
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                      {['Shape', 'Size', 'Colour', 'Required', 'In Stock', 'Shortfall', 'References'].map((col, i) => (
                        <th key={col} className={`px-5 py-3 text-[11px] font-semibold text-[#6b6560] uppercase tracking-wider ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe3]">
                    {orderStockLines.map((line, i) => {
                      const ok       = line.shortfall === 0;
                      const none     = line.availableStock <= 0;
                      const rowCls   = ok ? 'bg-emerald-50/60' : none ? 'bg-red-50/70' : 'bg-orange-50/60';
                      const stockCls = ok ? 'text-emerald-600 font-semibold' : none ? 'text-red-600 font-semibold' : 'text-orange-500 font-semibold';
                      return (
                        <Fragment key={i}>
                          {/* Summary row */}
                          <tr className={rowCls}>
                            <td className="px-5 py-3 font-mono text-xs font-bold text-[#1a1a1a]">{line.shape || '—'}</td>
                            <td className="px-5 py-3 font-mono text-xs text-[#6b6560]">{line.size || '—'}</td>
                            <td className="px-5 py-3 text-xs text-[#6b6560]">{line.colour || '—'}</td>
                            <td className="px-5 py-3 text-xs text-right text-[#1a1a1a]">{line.totalRequired}</td>
                            <td className={`px-5 py-3 text-xs text-right ${stockCls}`}>{line.availableStock}</td>
                            <td className="px-5 py-3 text-xs text-right">
                              {ok ? (
                                <span className="text-emerald-600 font-bold">✓</span>
                              ) : (
                                <span className={`font-bold ${none ? 'text-red-600' : 'text-orange-500'}`}>−{line.shortfall}</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-xs text-[#6b6560]">
                              {line.refs.map(r => r.productCode).join(', ')}
                            </td>
                          </tr>
                          {/* Product contribution sub-row */}
                          <tr className="bg-[#fafaf8]">
                            <td colSpan={7} className="pl-10 pr-5 py-1.5">
                              <p className="text-xs text-[#6b6560]">
                                {line.refs.map(r => `${r.productCode} — ${r.pieces} pcs`).join('  |  ')}
                              </p>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
