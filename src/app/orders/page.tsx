'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import NewOrderDrawer from '@/components/orders/NewOrderDrawer';

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'cad' | 'diamond_procurement' | 'manufacturing' | 'order_received';

interface OrderProduct {
  productCode: string;
  stage:       Stage;
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

// ── Toggle button group ───────────────────────────────────────────────────────

function FilterToggle({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
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

  // Client-side filtering
  const filtered = useMemo(() => {
    return orders.filter(o => {
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
  }, [orders, typeFilter, urgencyFilter, orderFrom, orderTo, deliveryFrom, deliveryTo]);

  return (
    <>
      <div className="p-8 min-h-screen bg-[#f8f5f0]">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-playfair text-3xl font-semibold text-[#1a1a1a]">Orders</h1>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] active:bg-[#304340] transition-colors shadow-sm"
          >
            <PlusIcon />
            New Order
          </button>
        </div>

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
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {loading ? (
          <p className="text-center text-[#6b6560] mt-16">Loading orders…</p>
        ) : filtered.length === 0 ? (
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
