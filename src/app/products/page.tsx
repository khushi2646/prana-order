'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import AddProductDrawer from '@/components/products/AddProductDrawer';

// ── Types ─────────────────────────────────────────────────────────────────────

const STATUSES = [
  'Pending',
  'Needs Manual Check',
  'Hold',
  'Rejected',
  'Approved',
] as const;

type Status = (typeof STATUSES)[number];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az',     label: 'Design No. A→Z' },
  { value: 'za',     label: 'Design No. Z→A' },
] as const;

type SortBy = (typeof SORT_OPTIONS)[number]['value'];

const CATEGORY_STYLES: Record<string, string[]> = {
  Ring:               ['Solitaire Ring','Two Stone Ring','Three Stone Ring','Cocktail Ring','Cocktail Ring with Colourstone','Fancy Ring','Fancy Band','Band Ring','Daily Ring'],
  Earrings:           ['Stud','Solitaire','Two Stone','Fancy','Cocktail','Colourstone','Halo','Cluster','Danglers','Drop','Long','Hoops','Huggies','Jhumka','Chandbali','Ear Cuff','Ear Jacket'],
  Pendant:            ['Solitaire','Two Stone','Fancy','Cocktail','Colourstone','Daily'],
  'Pendant Set':      ['Solitaire','Two Stone','Fancy','Cocktail','Colourstone','Floral','Halo','Cluster'],
  Necklace:           ['Choker','Single Strand Tennis','Tennis','Lariat','Collar','Chain','Multi-line','Hasli Collar Choker','Fancy'],
  'Necklace Earrings':['Necklace Earrings'],
  Bracelet:           ['Tennis','Single Line','Station','Oval Fancy','Solitaire Oval','Daily Oval','Fancy','Cocktail','Broad','Delicate','Bangle','Kada','Charm'],
  'Chain Pendant':    ['Hanging Pieces','Attached Pieces','With Colourstone','Gold Links','Station Chain','Lariat','Mangalsutra'],
};
const CATEGORIES = Object.keys(CATEGORY_STYLES);

const PAGE_SIZE = 48;

interface ProductSize {
  length?: number; width?: number; unit?: string;
}
interface GoldWeights {
  nineKt?: number; fourteenKt?: number; eighteenKt?: number;
}
interface Product {
  _id: string; designNumber: string;
  category?: string; style?: string; queueCode?: string;
  size?: ProductSize; cadImageUrl?: string;
  goldWeights?: GoldWeights; status: Status; createdAt?: string;
}

function formatSize(s?: ProductSize): string | null {
  if (!s?.length) return null;
  const u = s.unit ?? 'mm';
  return s.width ? `${s.length}${u} × ${s.width}${u}` : `${s.length}${u}`;
}
function formatGold(gw?: GoldWeights): string | null {
  if (!gw) return null;
  const parts: string[] = [];
  if (gw.nineKt     != null) parts.push(`9KT · ${gw.nineKt}g`);
  if (gw.fourteenKt != null) parts.push(`14KT · ${gw.fourteenKt}g`);
  if (gw.eighteenKt != null) parts.push(`18KT · ${gw.eighteenKt}g`);
  return parts.length ? parts.join(', ') : null;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  'Pending':            'bg-gray-100 text-gray-600 border border-gray-200',
  'Needs Manual Check': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Hold':               'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Rejected':           'bg-red-50 text-red-600 border border-red-200',
  'Approved':           'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

function gdEmbed(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-[#6b6560]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-[#6b6560] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

// ── Image placeholder ─────────────────────────────────────────────────────────

function Placeholder({ designNumber }: { designNumber: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0ebe3]">
      <svg className="w-12 h-12 text-brand/20 mb-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9L19 8H5l2.5-4zM12 17.5L5 9h14l-7 8.5z" />
      </svg>
      <span className="text-brand/30 text-xs font-bold tracking-widest uppercase">{designNumber}</span>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ p }: { p: Product }) {
  const [imgFailed, setImgFailed] = useState(false);
  const embed = gdEmbed(p.cadImageUrl);
  const showImg = !!embed && !imgFailed;

  return (
    <Link
      href={`/products/${p._id}`}
      className="bg-white rounded-xl overflow-hidden border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] hover:shadow-[0_10px_28px_rgba(26,26,26,0.13)] hover:-translate-y-1 transition-all duration-200 cursor-pointer group block"
    >
      {/* Thumbnail */}
      <div className="relative h-56 overflow-hidden">
        {showImg ? (
          <img
            src={embed!} alt={p.designNumber}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            onError={() => setImgFailed(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <Placeholder designNumber={p.designNumber} />
        )}
      </div>

      {/* Card body */}
      <div className="p-4 border-t border-[#f0ebe3]">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[16px] font-bold text-[#1a1a1a] leading-tight tracking-tight">
            {p.designNumber}
          </span>
          <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full leading-tight ${STATUS_STYLE[p.status] ?? 'bg-[#f0ebe3] text-[#6b6560] border border-[#ddd5c8]'}`}>
            {p.status}
          </span>
        </div>

        {(p.category || p.style) && (
          <p className="text-xs text-[#6b6560] leading-snug">
            {[p.category, p.style].filter(Boolean).join(' · ')}
          </p>
        )}
        {p.queueCode && (
          <p className="mt-1 text-[11px] font-mono text-[#6b6560]/60 tracking-wide">{p.queueCode}</p>
        )}
        {formatSize(p.size) && (
          <p className="mt-0.5 text-[11px] text-[#6b6560]/70">{formatSize(p.size)}</p>
        )}
        {formatGold(p.goldWeights) && (
          <p className="mt-0.5 text-[11px] text-[#6b6560]/70">{formatGold(p.goldWeights)}</p>
        )}
      </div>

      {/* Gold accent bar */}
      <div className="h-[3px] bg-[#c9a84c] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </Link>
  );
}

// ── Custom dropdown ───────────────────────────────────────────────────────────

interface SelectOption { value: string; label: string; }

function CustomSelect({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const allOptions: SelectOption[] = placeholder ? [{ value: '', label: placeholder }, ...options] : options;
  const activeLabel = allOptions.find(o => o.value === value)?.label ?? placeholder ?? options[0]?.label ?? '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 py-2.5 pl-3.5 pr-3 text-sm bg-white border border-[#ddd5c8] rounded-lg transition-colors hover:border-[#b8b0a6] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand min-w-[130px] justify-between"
      >
        <span className={value === '' ? 'text-[#6b6560]' : 'text-[#1a1a1a] font-medium'}>{activeLabel}</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 left-0 min-w-full w-max max-h-64 overflow-y-auto bg-white rounded-lg border border-[#e8e0d4] shadow-[0_8px_24px_rgba(26,26,26,0.12)] py-1 list-none">
          {allOptions.map(o => (
            <li key={o.value}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                  o.value === value
                    ? 'bg-brand text-white font-medium'
                    : 'text-[#1a1a1a] hover:bg-brand hover:text-white'
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts]               = useState<Product[]>([]);
  const [total, setTotal]                     = useState(0);
  const [page, setPage]                       = useState(1);
  const [loading, setLoading]                 = useState(true);
  const [loadingMore, setLoadingMore]         = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [search, setSearch]                   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter]   = useState('');
  const [styleFilter, setStyleFilter]         = useState('');
  const [sortBy, setSortBy]                   = useState<SortBy>('newest');
  const [drawerOpen, setDrawerOpen]           = useState(false);

  // Debounce search 300 ms — other filters apply immediately
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const doFetch = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }

    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(pageNum) });
    if (debouncedSearch)          params.set('search', debouncedSearch);
    if (selectedStatuses.length)  params.set('status', selectedStatuses.join(','));
    if (categoryFilter)           params.set('category', categoryFilter);
    if (styleFilter)    params.set('style',    styleFilter);
    params.set('sort', sortBy);

    try {
      const res  = await fetch(`/api/products?${params}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? res.statusText);
      setTotal(data.total);
      setProducts(prev => append ? [...prev, ...data.products] : data.products);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to the API server.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, selectedStatuses, categoryFilter, styleFilter, sortBy]);

  // Refetch page 1 whenever filters change (doFetch reference changes with deps)
  useEffect(() => { doFetch(1, false); }, [doFetch]);

  const styleOptions = useMemo(() => {
    if (categoryFilter) return CATEGORY_STYLES[categoryFilter] ?? [];
    const seen = new Set<string>();
    return Object.values(CATEGORY_STYLES).flat().filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
  }, [categoryFilter]);

  function handleCategoryChange(val: string) {
    setCategoryFilter(val);
    if (val && styleFilter) { const styles = CATEGORY_STYLES[val] ?? []; if (!styles.includes(styleFilter)) setStyleFilter(''); }
  }
  function clearAll() {
    setSearch('');
    setDebouncedSearch('');
    setSelectedStatuses([]);
    setCategoryFilter('');
    setStyleFilter('');
    setSortBy('newest');
  }

  const hasFilters = !!(search || selectedStatuses.length || categoryFilter || styleFilter || sortBy !== 'newest');
  const hasMore    = products.length < total;

  return (
    <>
      <div className="p-8">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-lg">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
              <input
                type="text"
                placeholder="Search by design number, category, style…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a]"
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand/90 active:bg-brand/80 transition-colors shrink-0 shadow-sm"
            >
              <PlusIcon />
              Add Product
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} type="button"
                onClick={() => setSelectedStatuses(prev =>
                  prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                )}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedStatuses.includes(s)
                    ? 'bg-[#456158] text-white border-[#456158]'
                    : 'bg-white border-[#ddd5c8] text-[#6b6560] hover:bg-[#f8f5f0]'
                }`}>
                {s}
              </button>
            ))}
            <CustomSelect
              value={categoryFilter}
              onChange={handleCategoryChange}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
              placeholder="All Categories"
            />
            <CustomSelect
              value={styleFilter}
              onChange={setStyleFilter}
              options={styleOptions.map(s => ({ value: s, label: s }))}
              placeholder="All Styles"
            />
            <CustomSelect
              value={sortBy}
              onChange={val => setSortBy(val as SortBy)}
              options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
            {hasFilters && (
              <button onClick={clearAll} className="py-2.5 px-3.5 text-sm text-[#6b6560] bg-white border border-[#ddd5c8] rounded-lg hover:bg-[#f0ebe3] transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Count ──────────────────────────────────────────────────── */}
        {!loading && !error && (
          <p className="text-xs text-[#6b6560] mb-5">
            {hasMore
              ? `Showing ${products.length} of ${total} product${total !== 1 ? 's' : ''}`
              : `${total} product${total !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* ── Loading ────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[#6b6560] gap-1">
            <p className="text-sm font-medium">{hasFilters ? 'No products match your filters.' : 'No products yet.'}</p>
            {hasFilters ? (
              <button onClick={clearAll} className="text-sm text-brand hover:underline mt-1">Clear filters</button>
            ) : (
              <button onClick={() => setDrawerOpen(true)} className="text-sm text-brand hover:underline mt-1">Add your first product</button>
            )}
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────────── */}
        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p._id} p={p} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8 mb-4">
                <button
                  onClick={() => doFetch(page + 1, true)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-brand border border-brand/30 rounded-lg hover:bg-brand/5 disabled:opacity-60 transition-colors"
                >
                  {loadingMore && (
                    <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  )}
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

      </div>

      <AddProductDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => doFetch(1, false)} />
    </>
  );
}
