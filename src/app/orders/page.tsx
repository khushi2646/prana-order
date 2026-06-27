'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NewOrderDrawer from '@/components/orders/NewOrderDrawer';

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage     = 'cad' | 'diamond_procurement' | 'manufacturing' | 'order_received';
type ActiveTab = 'orders' | 'products';

interface OrderProduct {
  productCode:   string;
  stage:         Stage;
  quantity?:     number;
  goldColour?:   string;
  goldCarat?:    string;
  productRef?:   string | null;
  isNewProduct?: boolean;
  stoneLines?:   unknown[];
  findings?:     string;
  remarks?:      string;
}

interface FlatProduct extends OrderProduct {
  orderMongoId: string;
  orderId:      string;
  customerName: string;
  isUrgent:     boolean;
  orderType:    'stock' | 'customer';
}

interface FollowUp {
  date:  string;
  notes: string;
}

interface Order {
  _id:          string;
  orderId:      string;
  orderType:    'stock' | 'customer';
  customerName: string;
  phoneNumber?: string;
  deliveryDate?: string;
  isUrgent:     boolean;
  remarks?:     string;
  products:     OrderProduct[];
  followUps:    FollowUp[];
  createdAt:    string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<Stage, string> = {
  cad:                 'CAD',
  diamond_procurement: 'Procurement',
  manufacturing:       'Manufacturing',
  order_received:      'Received',
};

const STAGE_BADGE: Record<Stage, string> = {
  cad:                 'bg-purple-100 text-purple-700',
  diamond_procurement: 'bg-blue-100 text-blue-700',
  manufacturing:       'bg-amber-100 text-amber-700',
  order_received:      'bg-green-100 text-green-700',
};

function stageSummary(products: OrderProduct[]): string {
  if (!products.length) return 'No products';
  const counts: Partial<Record<Stage, number>> = {};
  for (const p of products) {
    counts[p.stage] = (counts[p.stage] ?? 0) + 1;
  }
  return (Object.entries(counts) as [Stage, number][])
    .map(([stage, n]) => `${STAGE_LABEL[stage]}: ${n}`)
    .join(' | ');
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dateStr(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function gdriveThumbnail(url: string): string {
  const m = url.match(/\/d\/([^/]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : '';
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm p-5 border border-[#e8e0d4] cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      {/* Row 1 */}
      <div className="flex items-center gap-3 mb-2">
        <span className="font-bold text-[#1a1a1a] text-[15px]">{order.orderId}</span>
        <span className="text-[#1a1a1a] text-sm">{order.customerName}</span>
        <span
          className={`ml-auto shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
            order.orderType === 'customer'
              ? 'bg-[#edf3f1] text-[#456158] border-[#c0d5ce]'
              : 'bg-[#f4f4f4] text-[#6b6560] border-[#ddd5c8]'
          }`}
        >
          {order.orderType === 'customer' ? 'Customer' : 'Stock'}
        </span>
        {order.isUrgent && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            Urgent
          </span>
        )}
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-4 text-sm mb-2">
        <span>
          <span className="text-[#c9a84c] text-xs font-semibold mr-1">Delivery</span>
          <span className="text-[#1a1a1a]">{fmtDate(order.deliveryDate)}</span>
        </span>
        <span className="text-[#6b6560]">
          {order.products.length} product{order.products.length !== 1 ? 's' : ''}
        </span>
        {order.phoneNumber && (
          <span className="text-[#6b6560]">{order.phoneNumber}</span>
        )}
      </div>

      {/* Row 3 — stage summary */}
      <p className="text-[11px] text-[#6b6560] font-mono mb-1">{stageSummary(order.products)}</p>

      {/* Remarks */}
      {order.remarks && (
        <p className="text-xs text-[#6b6560] truncate mt-1">{order.remarks}</p>
      )}
    </div>
  );
}

// ── Product card (Products tab) ───────────────────────────────────────────────

function FlatProductCard({ product, cadImageUrl, onClick }: {
  product:     FlatProduct;
  cadImageUrl: string;
  onClick:     () => void;
}) {
  const thumbUrl    = cadImageUrl ? gdriveThumbnail(cadImageUrl) : '';
  const isIncomplete = product.isNewProduct && !product.productRef;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm p-4 border border-[#e8e0d4] cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Top row: code + stage badge + qty */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#1a1a1a]">{product.productCode}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_BADGE[product.stage] ?? 'bg-gray-100 text-gray-600'}`}>
              {STAGE_LABEL[product.stage]}
            </span>
            {product.quantity != null && (
              <span className="text-xs text-[#6b6560]">× {product.quantity}</span>
            )}
          </div>

          {/* Parent order link */}
          <p className="text-sm text-[#456158] underline truncate">
            {product.orderId} · {product.customerName}
          </p>

          {/* Urgent */}
          {product.isUrgent && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Urgent
            </span>
          )}

          {/* Incomplete warning */}
          {isIncomplete && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1.5">
              <p className="text-xs text-yellow-800">⚠️ Product details incomplete</p>
            </div>
          )}
        </div>

        {/* CAD thumbnail */}
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            className="w-14 h-14 rounded-lg object-cover border border-[#f0ebe3] shrink-0 self-start"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>
    </div>
  );
}

// ── Toggle button group ───────────────────────────────────────────────────────

function FilterToggle({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value:   string;
  onChange:(v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[#ddd5c8] overflow-hidden">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-2 text-sm transition-colors ${
            value === o.value
              ? 'bg-[#456158] text-white font-semibold'
              : 'bg-white text-[#6b6560] hover:bg-[#f0ebe3]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Date range input ──────────────────────────────────────────────────────────

const dateInp = 'px-3 py-2 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors text-[#1a1a1a]';

function DateRange({ label, from, to, onFrom, onTo }: {
  label: string; from: string; to: string;
  onFrom: (v: string) => void; onTo: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-[#6b6560] uppercase tracking-wider shrink-0">{label}</span>
      <input type="date" className={dateInp} value={from} onChange={e => onFrom(e.target.value)} />
      <span className="text-[#6b6560] text-xs">to</span>
      <input type="date" className={dateInp} value={to} onChange={e => onTo(e.target.value)} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState<ActiveTab>('orders');
  const [cadMap, setCadMap]         = useState<Record<string, string>>({});

  // Search
  const [search, setSearch] = useState('');

  // Filters
  const [typeFilter, setTypeFilter]       = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [orderFrom, setOrderFrom]         = useState('');
  const [orderTo, setOrderTo]             = useState('');
  const [deliveryFrom, setDeliveryFrom]   = useState('');
  const [deliveryTo, setDeliveryTo]       = useState('');

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  // Fetch CAD images for all unique productRefs across all orders
  useEffect(() => {
    const refs = [...new Set(
      orders.flatMap(o =>
        o.products.map(p => p.productRef).filter((r): r is string => !!r)
      )
    )];
    if (!refs.length) { setCadMap({}); return; }
    Promise.all(
      refs.map(ref =>
        fetch(`/api/products/${ref}`, { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<string, string> = {};
      refs.forEach((ref, i) => {
        if (results[i]?.cadImageUrl) map[ref] = results[i].cadImageUrl;
      });
      setCadMap(map);
    });
  }, [orders]);

  // Flat products list derived from orders
  const allProducts = useMemo<FlatProduct[]>(() =>
    orders.flatMap(o =>
      o.products.map(p => ({
        ...p,
        orderMongoId: o._id,
        orderId:      o.orderId,
        customerName: o.customerName,
        isUrgent:     o.isUrgent,
        orderType:    o.orderType,
      }))
    ),
  [orders]);

  // Orders tab filtering
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !o.orderId.toLowerCase().includes(q) &&
          !o.customerName.toLowerCase().includes(q) &&
          !(o.phoneNumber ?? '').toLowerCase().includes(q)
        ) return false;
      }
      if (typeFilter && o.orderType !== typeFilter) return false;
      if (urgencyFilter === 'urgent' && !o.isUrgent) return false;

      if (orderFrom || orderTo) {
        const d = dateStr(o.createdAt);
        if (orderFrom && d < orderFrom) return false;
        if (orderTo   && d > orderTo)   return false;
      }
      if (deliveryFrom || deliveryTo) {
        const d = dateStr(o.deliveryDate);
        if (!d) return false;
        if (deliveryFrom && d < deliveryFrom) return false;
        if (deliveryTo   && d > deliveryTo)   return false;
      }
      return true;
    });
  }, [orders, search, typeFilter, urgencyFilter, orderFrom, orderTo, deliveryFrom, deliveryTo]);

  // Products tab filtering
  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !p.productCode.toLowerCase().includes(q) &&
          !p.orderId.toLowerCase().includes(q) &&
          !p.customerName.toLowerCase().includes(q)
        ) return false;
      }
      if (typeFilter && p.orderType !== typeFilter) return false;
      if (urgencyFilter === 'urgent' && !p.isUrgent) return false;
      return true;
    });
  }, [allProducts, search, typeFilter, urgencyFilter]);

  return (
    <>
      <div className="p-8 min-h-screen bg-[#f8f5f0]">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-playfair text-3xl font-semibold text-[#1a1a1a]">Orders</h1>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] active:bg-[#304340] transition-colors shadow-sm"
          >
            <PlusIcon />
            New Order
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-6 border-b border-[#e8e0d4] mb-6">
          {(['orders', 'products'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-sm transition-colors ${
                activeTab === tab
                  ? 'text-[#456158] border-b-2 border-[#456158] font-semibold'
                  : 'text-[#6b6560] hover:text-[#1a1a1a]'
              }`}
            >
              {tab === 'orders' ? 'Orders' : 'Products'}
            </button>
          ))}
        </div>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <input
          type="text"
          className="w-full rounded-xl border border-[#ddd5c8] px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a] mb-4"
          placeholder={
            activeTab === 'orders'
              ? 'Search by order number, customer name or phone…'
              : 'Search by product code, order number or customer name…'
          }
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
          <FilterToggle
            options={[{ label: 'All', value: '' }, { label: 'Stock', value: 'stock' }, { label: 'Customer', value: 'customer' }]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
          <FilterToggle
            options={[{ label: 'All', value: '' }, { label: 'Urgent Only', value: 'urgent' }]}
            value={urgencyFilter}
            onChange={setUrgencyFilter}
          />
          {activeTab === 'orders' && (
            <>
              <DateRange
                label="Order Date"
                from={orderFrom} to={orderTo}
                onFrom={setOrderFrom} onTo={setOrderTo}
              />
              <DateRange
                label="Delivery Date"
                from={deliveryFrom} to={deliveryTo}
                onFrom={setDeliveryFrom} onTo={setDeliveryTo}
              />
            </>
          )}
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {loading ? (
          <p className="text-center text-[#6b6560] mt-16">Loading…</p>
        ) : activeTab === 'orders' ? (
          filtered.length === 0 ? (
            <p className="text-center text-[#6b6560] mt-16">No orders found</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(o => (
                <OrderCard
                  key={o._id}
                  order={o}
                  onClick={() => router.push(`/orders/${o._id}`)}
                />
              ))}
            </div>
          )
        ) : (
          filteredProducts.length === 0 ? (
            <p className="text-center text-[#6b6560] mt-16">No products found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p, i) => (
                <FlatProductCard
                  key={`${p.orderMongoId}-${i}`}
                  product={p}
                  cadImageUrl={p.productRef ? (cadMap[p.productRef] ?? '') : ''}
                  onClick={() => router.push(`/orders/${p.orderMongoId}`)}
                />
              ))}
            </div>
          )
        )}
      </div>

      <NewOrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchOrders}
      />
    </>
  );
}
