'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddProductToOrderDrawer from '@/components/orders/AddProductDrawer';

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage      = 'cad' | 'diamond_procurement' | 'manufacturing' | 'order_received';
type GoldColour = 'yellow' | 'white' | 'rose';
type GoldCarat  = '9kt' | '14kt' | '18kt';

interface OrderStoneLine {
  shape?:        string;
  size?:         string;
  colour?:       string;
  piecesPerUnit?: number;
  totalPieces?:  number;
}

interface OrderProduct {
  productCode:          string;
  productRef?:          string | null;
  isNewProduct?:        boolean;
  newProductDescription?: string;
  quantity:             number;
  goldColour:           GoldColour;
  goldCarat:            GoldCarat;
  findings?:            string;
  stoneLines:           OrderStoneLine[];
  stage:                Stage;
  remarks?:             string;
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
  goldRate?:    { isFixed: boolean; fixedRate?: number };
  targetBudget?: number;
  deliveryDate?: string;
  isUrgent:     boolean;
  remarks?:     string;
  followUps:    FollowUp[];
  products:     OrderProduct[];
  createdAt:    string;
  updatedAt:    string;
}

// ── Edit header form state ────────────────────────────────────────────────────

interface HeaderForm {
  customerName:  string;
  phoneNumber:   string;
  orderType:     'stock' | 'customer' | '';
  isUrgent:      boolean;
  goldRateFixed: boolean;
  fixedRate:     string;
  targetBudget:  string;
  deliveryDate:  string;
  remarks:       string;
}

function orderToHeaderForm(o: Order): HeaderForm {
  return {
    customerName:  o.customerName,
    phoneNumber:   o.phoneNumber ?? '',
    orderType:     o.orderType,
    isUrgent:      o.isUrgent,
    goldRateFixed: o.goldRate?.isFixed ?? false,
    fixedRate:     o.goldRate?.fixedRate != null ? String(o.goldRate.fixedRate) : '',
    targetBudget:  o.targetBudget != null ? String(o.targetBudget) : '',
    deliveryDate:  o.deliveryDate ? o.deliveryDate.slice(0, 10) : '',
    remarks:       o.remarks ?? '',
  };
}

// ── Edit product form ─────────────────────────────────────────────────────────

interface EditProductForm {
  productCode: string;
  quantity:    string;
  goldColour:  GoldColour | '';
  goldCarat:   GoldCarat  | '';
  findings:    string;
  stage:       Stage;
  remarks:     string;
  stoneLines:  Array<{ shape: string; size: string; colour: string; piecesPerUnit: string }>;
}

function productToEditForm(p: OrderProduct): EditProductForm {
  return {
    productCode: p.productCode,
    quantity:    String(p.quantity),
    goldColour:  p.goldColour,
    goldCarat:   p.goldCarat,
    findings:    p.findings ?? '',
    stage:       p.stage,
    remarks:     p.remarks ?? '',
    stoneLines:  (p.stoneLines ?? []).map(sl => ({
      shape:        sl.shape        ?? '',
      size:         sl.size         ?? '',
      colour:       sl.colour       ?? 'WHITE',
      piecesPerUnit: sl.piecesPerUnit != null ? String(sl.piecesPerUnit) : '',
    })),
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_CONFIG: { value: Stage; label: string }[] = [
  { value: 'cad',                 label: 'CAD'           },
  { value: 'diamond_procurement', label: 'Procurement'   },
  { value: 'manufacturing',       label: 'Manufacturing' },
  { value: 'order_received',      label: 'Received'      },
];

const GOLD_COLOURS: { value: GoldColour; label: string }[] = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'white',  label: 'White'  },
  { value: 'rose',   label: 'Rose'   },
];
const GOLD_CARATS: GoldCarat[] = ['9kt', '14kt', '18kt'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function gdriveThumbnail(url: string): string {
  const m = url.match(/\/d\/([^/]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : '';
}

const inp = 'w-full px-3 py-2 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a]';

// ── Diamond summary ───────────────────────────────────────────────────────────

interface DiamondGroup {
  shape:       string;
  size:        string;
  colour:      string;
  totalPieces: number;
  refs:        Array<{ code: string; pieces: number }>;
}

function computeDiamondSummary(products: OrderProduct[]): DiamondGroup[] {
  const map = new Map<string, DiamondGroup>();
  for (const product of products) {
    for (const sl of product.stoneLines ?? []) {
      if (!sl.shape && !sl.size) continue;
      const key = `${sl.shape ?? ''}|${sl.size ?? ''}|${sl.colour ?? ''}`;
      if (!map.has(key)) {
        map.set(key, { shape: sl.shape ?? '', size: sl.size ?? '', colour: sl.colour ?? '', totalPieces: 0, refs: [] });
      }
      const g = map.get(key)!;
      const pcs = sl.totalPieces ?? 0;
      g.totalPieces += pcs;
      if (pcs > 0) g.refs.push({ code: product.productCode, pieces: pcs });
    }
  }
  return Array.from(map.values());
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[#ddd5c8] overflow-hidden">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${value === o.value ? 'bg-[#456158] text-white' : 'bg-white text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, index, orderId, onRefresh, cadImageUrl }: {
  product:      OrderProduct;
  index:        number;
  orderId:      string;
  onRefresh:    () => void;
  cadImageUrl?: string;
}) {
  const cardRouter = useRouter();
  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState<EditProductForm>(() => productToEditForm(product));
  const [stageSaving, setStageSaving] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [removing, setRemoving]     = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  const isIncomplete = product.isNewProduct && !product.productRef;

  function setEF<K extends keyof EditProductForm>(key: K, val: EditProductForm[K]) {
    setEditForm(prev => ({ ...prev, [key]: val }));
  }

  function updateSL(i: number, field: keyof EditProductForm['stoneLines'][number], val: string) {
    setEditForm(prev => ({
      ...prev,
      stoneLines: prev.stoneLines.map((sl, idx) => idx === i ? { ...sl, [field]: val } : sl),
    }));
  }

  async function changeStage(stage: Stage) {
    setStageSaving(true);
    try {
      await fetch(`/api/orders/${orderId}/products/${index}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stage }),
      });
      onRefresh();
    } finally {
      setStageSaving(false);
    }
  }

  async function saveEdit() {
    setEditError(null);
    const qty = parseInt(editForm.quantity) || 0;
    if (!editForm.productCode.trim()) { setEditError('Product Code required.'); return; }
    if (qty < 1)                      { setEditError('Quantity must be at least 1.'); return; }
    if (!editForm.goldColour)         { setEditError('Gold Colour required.'); return; }
    if (!editForm.goldCarat)          { setEditError('Gold Carat required.'); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        productCode: editForm.productCode.trim(),
        quantity:    qty,
        goldColour:  editForm.goldColour,
        goldCarat:   editForm.goldCarat,
        stage:       editForm.stage,
        stoneLines:  editForm.stoneLines.map(sl => ({
          shape:        sl.shape  || undefined,
          size:         sl.size   || undefined,
          colour:       sl.colour || 'WHITE',
          piecesPerUnit: sl.piecesPerUnit ? parseInt(sl.piecesPerUnit) : undefined,
          totalPieces:  sl.piecesPerUnit && qty > 0 ? parseInt(sl.piecesPerUnit) * qty : undefined,
        })),
      };
      if (editForm.findings.trim()) body.findings = editForm.findings.trim();
      if (editForm.remarks.trim())  body.remarks  = editForm.remarks.trim();

      const res = await fetch(`/api/orders/${orderId}/products/${index}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update');
      setEditing(false);
      onRefresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct() {
    if (!confirm(`Remove product "${product.productCode}" from this order?`)) return;
    setRemoving(true);
    try {
      await fetch(`/api/orders/${orderId}/products/${index}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setRemoving(false);
    }
  }

  const goldColourBadge: Record<GoldColour, string> = {
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    white:  'bg-slate-50  text-slate-700  border-slate-200',
    rose:   'bg-pink-50   text-pink-700   border-pink-200',
  };

  if (editing) {
    const qty = parseInt(editForm.quantity) || 0;
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#456158]/30 p-5 space-y-4">
        {/* Edit form */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1a1a1a]">Edit product</span>
          <button type="button" onClick={() => { setEditing(false); setEditForm(productToEditForm(product)); setEditError(null); }}
            className="text-xs text-[#6b6560] hover:text-[#1a1a1a]">Cancel</button>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Product Code</label>
          <input className={inp} type="text" value={editForm.productCode} onChange={e => setEF('productCode', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Quantity</label>
          <input className={inp} type="number" min={1} value={editForm.quantity} onChange={e => setEF('quantity', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Gold Colour</label>
          <ToggleRow options={GOLD_COLOURS} value={editForm.goldColour} onChange={v => setEF('goldColour', v as GoldColour)} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Gold Carat</label>
          <div className="flex rounded-lg border border-[#ddd5c8] overflow-hidden">
            {GOLD_CARATS.map(c => (
              <button key={c} type="button" onClick={() => setEF('goldCarat', c)}
                className={`flex-1 py-2 text-sm font-medium uppercase transition-colors ${editForm.goldCarat === c ? 'bg-[#456158] text-white' : 'bg-white text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Findings</label>
          <input className={inp} type="text" placeholder="e.g. peg head" value={editForm.findings} onChange={e => setEF('findings', e.target.value)} />
        </div>

        {/* Stone lines */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Stone Lines</label>
            <button type="button" onClick={() => setEF('stoneLines', [...editForm.stoneLines, { shape: '', size: '', colour: 'WHITE', piecesPerUnit: '' }])}
              className="text-xs text-[#456158] font-semibold hover:underline">+ Add Row</button>
          </div>
          {editForm.stoneLines.length > 0 && (
            <div className="rounded-lg border border-[#e8e0d4] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f8f5f0] text-[#6b6560]">
                    <th className="px-2 py-1.5 text-left font-semibold">Shape</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Size</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Colour</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Per Unit</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                    <th className="px-1 py-1.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe3]">
                  {editForm.stoneLines.map((sl, i) => {
                    const total = sl.piecesPerUnit && qty > 0 ? parseInt(sl.piecesPerUnit) * qty : null;
                    return (
                      <tr key={i}>
                        <td className="px-1 py-1"><input className="w-full px-1.5 py-1 text-xs border border-[#ddd5c8] rounded" placeholder="ROUND" value={sl.shape} onChange={e => updateSL(i, 'shape', e.target.value)} /></td>
                        <td className="px-1 py-1"><input className="w-full px-1.5 py-1 text-xs border border-[#ddd5c8] rounded" placeholder="1.30" value={sl.size} onChange={e => updateSL(i, 'size', e.target.value)} /></td>
                        <td className="px-1 py-1"><input className="w-full px-1.5 py-1 text-xs border border-[#ddd5c8] rounded" placeholder="WHITE" value={sl.colour} onChange={e => updateSL(i, 'colour', e.target.value)} /></td>
                        <td className="px-1 py-1"><input className="w-14 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded text-right" type="number" min={0} placeholder="0" value={sl.piecesPerUnit} onChange={e => updateSL(i, 'piecesPerUnit', e.target.value)} /></td>
                        <td className="px-2 py-1 text-right font-semibold text-[#456158]">{total ?? '—'}</td>
                        <td className="px-1 py-1 text-center">
                          <button type="button" onClick={() => setEF('stoneLines', editForm.stoneLines.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Stage</label>
          <div className="grid grid-cols-2 gap-1.5">
            {STAGE_CONFIG.map(s => (
              <button key={s.value} type="button" onClick={() => setEF('stage', s.value)}
                className={`py-2 text-xs font-medium rounded-lg border transition-colors ${editForm.stage === s.value ? 'bg-[#456158] text-white border-[#456158]' : 'bg-white text-[#6b6560] border-[#ddd5c8] hover:bg-[#f0ebe3]'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Remarks</label>
          <textarea className={`${inp} resize-none`} rows={2} value={editForm.remarks} onChange={e => setEF('remarks', e.target.value)} />
        </div>

        {editError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}

        <button type="button" onClick={saveEdit} disabled={saving}
          className="w-full py-2 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    );
  }

  // ── Read-only card ──────────────────────────────────────────────────────────

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-[#e8e0d4] p-5 space-y-3 relative${cadImageUrl ? ' pr-24' : ''}`}>
      {cadImageUrl && (
        <img
          src={gdriveThumbnail(cadImageUrl)}
          alt=""
          className="absolute top-4 right-4 w-16 h-16 rounded-lg object-cover border border-[#f0ebe3]"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-[#1a1a1a]">{product.productCode}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${goldColourBadge[product.goldColour] ?? 'bg-[#f0ebe3] text-[#6b6560] border-[#ddd5c8]'}`}>
          {product.goldColour}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-[#f0ebe3] text-[#6b6560] border-[#ddd5c8] uppercase">
          {product.goldCarat}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => { setEditForm(productToEditForm(product)); setEditing(true); }}
            className="text-xs text-[#456158] font-semibold hover:underline">Edit</button>
          <button type="button" onClick={removeProduct} disabled={removing}
            className="text-xs text-red-500 font-semibold hover:underline disabled:opacity-50">
            {removing ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>

      {/* Incomplete warning */}
      {isIncomplete && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 space-y-1.5">
          <p className="text-sm text-yellow-800">⚠️ Product details incomplete — not yet added to catalogue</p>
          <button
            type="button"
            onClick={() => cardRouter.push(`/products/new?fromOrder=${orderId}&productCode=${encodeURIComponent(product.productCode)}`)}
            className="text-sm text-[#456158] underline"
          >
            Complete Product Details →
          </button>
        </div>
      )}

      {/* Stage selector */}
      <div className="flex gap-1 flex-wrap">
        {STAGE_CONFIG.map(s => (
          <button key={s.value} type="button"
            onClick={() => !stageSaving && changeStage(s.value)}
            disabled={stageSaving}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${product.stage === s.value ? 'bg-[#456158] text-white border-[#456158]' : 'bg-white text-[#6b6560] border-[#ddd5c8] hover:bg-[#f0ebe3]'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Details row */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span><span className="text-xs text-[#6b6560] mr-1">Qty</span>{product.quantity}</span>
        {product.findings && <span><span className="text-xs text-[#6b6560] mr-1">Findings</span>{product.findings}</span>}
      </div>

      {/* Stone lines */}
      {product.stoneLines?.length > 0 && (
        <div className="rounded-lg border border-[#e8e0d4] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#f8f5f0] text-[#6b6560]">
                <th className="px-3 py-1.5 text-left font-semibold">Shape</th>
                <th className="px-3 py-1.5 text-left font-semibold">Size</th>
                <th className="px-3 py-1.5 text-left font-semibold">Colour</th>
                <th className="px-3 py-1.5 text-right font-semibold">Per Unit</th>
                <th className="px-3 py-1.5 text-right font-semibold">Total Pcs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {product.stoneLines.map((sl, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5">{sl.shape || '—'}</td>
                  <td className="px-3 py-1.5">{sl.size  || '—'}</td>
                  <td className="px-3 py-1.5">{sl.colour || '—'}</td>
                  <td className="px-3 py-1.5 text-right">{sl.piecesPerUnit ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-[#456158]">{sl.totalPieces ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {product.remarks && <p className="text-xs text-[#6b6560] italic">{product.remarks}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();

  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);

  // Header edit state
  const [editing, setEditing]         = useState(false);
  const [headerForm, setHeaderForm]   = useState<HeaderForm | null>(null);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);

  // Follow-up state
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [followUpNotes, setFollowUpNotes]   = useState('');
  const [fuSaving, setFuSaving]             = useState(false);
  const [fuError, setFuError]               = useState<string | null>(null);

  // Add product drawer
  const [drawerOpen, setDrawerOpen]   = useState(false);

  // CAD image map: productRef → cadImageUrl
  const [cadMap, setCadMap] = useState<Record<string, string>>({});

  // Delete order
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error('Failed to load');
      setOrder(await res.json());
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Populate cadMap whenever order changes
  useEffect(() => {
    if (!order) return;
    const refs = order.products
      .map(p => p.productRef)
      .filter((ref): ref is string => !!ref);
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
  }, [order]);

  async function handleDeleteOrder() {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'Failed to delete order');
      }
      router.push('/orders');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete order');
      setDeleting(false);
    }
  }

  // ── Header edit ─────────────────────────────────────────────────────────────

  function startEditing() {
    if (!order) return;
    setHeaderForm(orderToHeaderForm(order));
    setHeaderError(null);
    setEditing(true);
  }

  function setHF<K extends keyof HeaderForm>(key: K, val: HeaderForm[K]) {
    setHeaderForm(prev => prev ? { ...prev, [key]: val } : null);
  }

  async function saveHeader() {
    if (!headerForm || !order) return;
    setHeaderError(null);
    if (!headerForm.customerName.trim()) { setHeaderError('Customer name is required.'); return; }
    if (!headerForm.orderType)           { setHeaderError('Order type is required.'); return; }

    setHeaderSaving(true);
    try {
      const body: Record<string, unknown> = {
        customerName: headerForm.customerName.trim(),
        orderType:    headerForm.orderType,
        isUrgent:     headerForm.isUrgent,
        goldRate: {
          isFixed:   headerForm.goldRateFixed,
          ...(headerForm.goldRateFixed && headerForm.fixedRate ? { fixedRate: parseFloat(headerForm.fixedRate) } : {}),
        },
      };
      if (headerForm.phoneNumber.trim())  body.phoneNumber  = headerForm.phoneNumber.trim();
      if (headerForm.targetBudget)        body.targetBudget = parseFloat(headerForm.targetBudget);
      if (headerForm.deliveryDate)        body.deliveryDate = headerForm.deliveryDate;
      body.remarks = headerForm.remarks.trim() || null;

      const res = await fetch(`/api/orders/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save');
      setOrder(data);
      setEditing(false);
    } catch (err) {
      setHeaderError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setHeaderSaving(false);
    }
  }

  // ── Follow-up ───────────────────────────────────────────────────────────────

  async function saveFollowUp() {
    setFuError(null);
    if (!followUpNotes.trim()) { setFuError('Notes are required.'); return; }
    setFuSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}/followups`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes: followUpNotes.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save');
      setOrder(data);
      setAddingFollowUp(false);
      setFollowUpNotes('');
    } catch (err) {
      setFuError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setFuSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#f8f5f0]"><p className="text-[#6b6560]">Loading order…</p></div>;
  }
  if (notFound || !order) {
    return <div className="flex items-center justify-center min-h-screen bg-[#f8f5f0]"><p className="text-[#6b6560]">Order not found.</p></div>;
  }

  const diamondSummary = computeDiamondSummary(order.products);

  return (
    <>
      <div className="min-h-screen bg-[#f8f5f0] p-8 max-w-4xl mx-auto">

        {/* ── Back link ────────────────────────────────────────────────── */}
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-[#6b6560] hover:text-[#1a1a1a] mb-6 group transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Orders
        </Link>

        {/* ── Page title ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-playfair text-3xl font-semibold text-[#1a1a1a]">
              {order.orderId} — {order.customerName}
            </h1>
            {order.isUrgent && (
              <span className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Urgent
              </span>
            )}
          </div>
          {!editing && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleDeleteOrder} disabled={deleting}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete Order'}
              </button>
              <button onClick={startEditing}
                className="px-4 py-2 text-sm font-semibold bg-white border border-[#ddd5c8] text-[#1a1a1a] rounded-lg hover:bg-[#f0ebe3] transition-colors shadow-sm">
                Edit
              </button>
            </div>
          )}
        </div>

        {deleteError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">{deleteError}</p>
        )}

        {/* Pills row */}
        {!editing && (
          <div className="flex flex-wrap gap-2 mb-8">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${order.orderType === 'customer' ? 'bg-[#edf3f1] text-[#456158] border-[#c0d5ce]' : 'bg-[#f4f4f4] text-[#6b6560] border-[#ddd5c8]'}`}>
              {order.orderType === 'customer' ? 'Customer Order' : 'Stock Order'}
            </span>
            {order.deliveryDate && (
              <span className="text-xs px-3 py-1 rounded-full border bg-white border-[#ddd5c8] text-[#6b6560]">
                <span className="text-[#c9a84c] font-semibold mr-1">Delivery</span>{fmtDate(order.deliveryDate)}
              </span>
            )}
            {order.phoneNumber && (
              <span className="text-xs px-3 py-1 rounded-full border bg-white border-[#ddd5c8] text-[#6b6560]">{order.phoneNumber}</span>
            )}
          </div>
        )}

        {/* ── Order header edit ─────────────────────────────────────────── */}
        {editing && headerForm && (
          <div className="bg-white rounded-xl border border-[#456158]/30 shadow-sm p-6 mb-8 space-y-5">
            <h2 className="font-semibold text-[#1a1a1a] mb-1">Edit Order Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Customer Name <span className="text-red-500">*</span></label>
                <input className={inp} type="text" value={headerForm.customerName} onChange={e => setHF('customerName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Phone Number</label>
                <input className={inp} type="tel" value={headerForm.phoneNumber} onChange={e => setHF('phoneNumber', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Order Type <span className="text-red-500">*</span></label>
              <ToggleRow
                options={[{ value: 'stock', label: 'Stock' }, { value: 'customer', label: 'Customer' }]}
                value={headerForm.orderType}
                onChange={v => setHF('orderType', v as 'stock' | 'customer')}
              />
            </div>

            <div className="flex items-center gap-3">
              <input id="editUrgent" type="checkbox" checked={headerForm.isUrgent} onChange={e => setHF('isUrgent', e.target.checked)}
                className="w-4 h-4 rounded border-[#ddd5c8] accent-[#456158]" />
              <label htmlFor="editUrgent" className="text-sm text-[#1a1a1a] cursor-pointer select-none">Mark as Urgent</label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Gold Rate</label>
              <ToggleRow
                options={[{ value: 'false', label: 'Not Fixed' }, { value: 'true', label: 'Fixed' }]}
                value={headerForm.goldRateFixed ? 'true' : 'false'}
                onChange={v => setHF('goldRateFixed', v === 'true')}
              />
              {headerForm.goldRateFixed && (
                <input className={inp} type="number" min={0} step={0.01} placeholder="Rate per gram (₹)"
                  value={headerForm.fixedRate} onChange={e => setHF('fixedRate', e.target.value)} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Target Budget (₹)</label>
                <input className={inp} type="number" min={0} placeholder="e.g. 50000"
                  value={headerForm.targetBudget} onChange={e => setHF('targetBudget', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Delivery Date</label>
                <input className={inp} type="date" value={headerForm.deliveryDate} onChange={e => setHF('deliveryDate', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Remarks</label>
              <textarea className={`${inp} resize-none`} rows={3} value={headerForm.remarks} onChange={e => setHF('remarks', e.target.value)} />
            </div>

            {headerError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{headerError}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={saveHeader} disabled={headerSaving}
                className="flex-1 py-2.5 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] transition-colors disabled:opacity-60">
                {headerSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { setEditing(false); setHeaderError(null); }}
                className="px-4 py-2.5 text-sm font-semibold bg-white border border-[#ddd5c8] text-[#6b6560] rounded-lg hover:bg-[#f0ebe3] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Read-only order fields when not editing */}
        {!editing && (
          <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-6 mb-8 space-y-3">
            {order.goldRate && (
              <div className="flex gap-6 text-sm">
                <span><span className="text-xs text-[#6b6560] mr-1.5">Gold Rate</span>{order.goldRate.isFixed ? `Fixed — ₹${order.goldRate.fixedRate ?? '—'}/g` : 'Not Fixed'}</span>
              </div>
            )}
            {order.targetBudget != null && (
              <div className="text-sm"><span className="text-xs text-[#6b6560] mr-1.5">Target Budget</span>₹{order.targetBudget.toLocaleString('en-IN')}</div>
            )}
            {order.remarks && (
              <div className="text-sm"><span className="text-xs text-[#6b6560] mr-1.5">Remarks</span>{order.remarks}</div>
            )}
          </div>
        )}

        {/* ── Follow-ups ────────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="font-playfair text-xl font-semibold text-[#1a1a1a] mb-4">Follow-ups</h2>

          {order.followUps.length > 0 ? (
            <div className="space-y-3 mb-4">
              {order.followUps.map((fu, i) => (
                <div key={i} className="flex gap-4 bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-4">
                  <div className="shrink-0 w-2 h-2 rounded-full bg-[#456158] mt-1.5" />
                  <div>
                    <p className="text-xs text-[#6b6560] mb-0.5">{fmtDate(fu.date)}</p>
                    <p className="text-sm text-[#1a1a1a]">{fu.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6b6560] mb-4">No follow-ups yet.</p>
          )}

          {order.followUps.length >= 3 ? (
            <p className="text-xs text-[#6b6560] italic">Maximum follow-ups reached.</p>
          ) : !addingFollowUp ? (
            <button onClick={() => setAddingFollowUp(true)}
              className="text-sm text-[#456158] font-semibold hover:underline">+ Add Follow-up</button>
          ) : (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-4 space-y-3">
              <textarea className={`${inp} resize-none`} rows={3} placeholder="Notes…"
                value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} autoFocus />
              {fuError && <p className="text-xs text-red-600">{fuError}</p>}
              <div className="flex gap-2">
                <button onClick={saveFollowUp} disabled={fuSaving}
                  className="px-4 py-2 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] transition-colors disabled:opacity-60">
                  {fuSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setAddingFollowUp(false); setFollowUpNotes(''); setFuError(null); }}
                  className="px-4 py-2 text-sm font-semibold bg-white border border-[#ddd5c8] text-[#6b6560] rounded-lg hover:bg-[#f0ebe3] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Products ──────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-playfair text-xl font-semibold text-[#1a1a1a]">Products</h2>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] transition-colors shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
                <path strokeLinecap="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>

          {order.products.some(p => p.isNewProduct && !p.productRef) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-4">
              <p className="text-sm text-yellow-800">⚠️ Some products in this order have incomplete details</p>
            </div>
          )}

          {order.products.length === 0 ? (
            <p className="text-sm text-[#6b6560]">No products added yet.</p>
          ) : (
            <div className="space-y-4">
              {order.products.map((product, i) => (
                <ProductCard
                  key={i}
                  product={product}
                  index={i}
                  orderId={id}
                  onRefresh={fetchOrder}
                  cadImageUrl={product.productRef ? (cadMap[product.productRef] ?? '') : ''}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Diamond Summary ───────────────────────────────────────────── */}
        <section>
          <h2 className="font-playfair text-xl font-semibold text-[#1a1a1a] mb-4">Diamond Summary</h2>

          {diamondSummary.length === 0 ? (
            <p className="text-sm text-[#6b6560]">No diamond requirements logged yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f8f5f0] text-[#6b6560] border-b border-[#e8e0d4]">
                    <th className="px-4 py-3 text-left font-semibold">Shape</th>
                    <th className="px-4 py-3 text-left font-semibold">Size</th>
                    <th className="px-4 py-3 text-left font-semibold">Colour</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Pcs</th>
                    <th className="px-4 py-3 text-left font-semibold">References</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe3]">
                  {diamondSummary.map((g, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-mono text-[#1a1a1a]">{g.shape || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[#1a1a1a]">{g.size  || '—'}</td>
                      <td className="px-4 py-3 text-[#1a1a1a]">{g.colour || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#456158]">{g.totalPieces}</td>
                      <td className="px-4 py-3 text-[#6b6560] text-xs">
                        {g.refs.map(r => `${r.code} (${r.pieces} pcs)`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AddProductToOrderDrawer
        open={drawerOpen}
        orderId={id}
        onClose={() => setDrawerOpen(false)}
        onSuccess={fetchOrder}
      />
    </>
  );
}
