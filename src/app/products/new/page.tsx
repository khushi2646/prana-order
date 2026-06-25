'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalStoneLine {
  shape:       string;
  size:        string;
  colour:      string;
  count:       string;
  totalWeight: string;
  setting:     string;
  remarks:     string;
}

interface FormState {
  designNumber:    string;
  category:        string;
  style:           string;
  size:            string;
  goldWeightNine:  string;
  goldWeightFourteen: string;
  goldWeightEighteen: string;
  cadImageUrl:     string;
  stoneLines:      LocalStoneLine[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Ring',              value: 'Ring'             },
  { label: 'Earrings',         value: 'Earrings'         },
  { label: 'Pendant',          value: 'Pendant'          },
  { label: 'Pendant Set',      value: 'Pendant Set'      },
  { label: 'Necklace',         value: 'Necklace'         },
  { label: 'Necklace Earrings',value: 'Necklace Earrings'},
  { label: 'Bracelet',         value: 'Bracelet'         },
  { label: 'Chain Pendant',    value: 'Chain Pendant'    },
];

const EMPTY_SL: LocalStoneLine = {
  shape: '', size: '', colour: 'WHITE',
  count: '', totalWeight: '', setting: '', remarks: '',
};

const EMPTY_FORM: FormState = {
  designNumber: '', category: '', style: '', size: '',
  goldWeightNine: '', goldWeightFourteen: '', goldWeightEighteen: '',
  cadImageUrl: '', stoneLines: [],
};

const inp  = 'w-full px-3 py-2.5 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a]';
const label = 'block text-xs font-semibold text-[#6b6560] uppercase tracking-wider mb-1.5';

// ── Inner form (uses useSearchParams) ─────────────────────────────────────────

function NewProductForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const fromOrder   = searchParams.get('fromOrder')   ?? '';
  const productCode = searchParams.get('productCode') ?? '';

  const fromOrderMode = !!fromOrder;
  const backHref      = fromOrderMode ? `/orders/${fromOrder}` : '/products';

  const [form, setForm]     = useState<FormState>({
    ...EMPTY_FORM,
    designNumber: productCode,
  });
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // If productCode param is added after mount (edge case), sync it
  useEffect(() => {
    if (productCode) setForm(prev => ({ ...prev, designNumber: productCode }));
  }, [productCode]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function updateSL(i: number, field: keyof LocalStoneLine, val: string) {
    setForm(prev => ({
      ...prev,
      stoneLines: prev.stoneLines.map((sl, idx) => idx === i ? { ...sl, [field]: val } : sl),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.designNumber.trim()) { setError('Design Number is required.'); return; }

    setSaving(true);
    try {
      // Build stone lines
      const stoneLines = form.stoneLines
        .filter(sl => sl.shape || sl.size || sl.count)
        .map(sl => ({
          shape:       sl.shape       || undefined,
          size:        sl.size        || undefined,
          colour:      sl.colour      || 'WHITE',
          count:       sl.count       ? parseInt(sl.count)         : undefined,
          totalWeight: sl.totalWeight ? parseFloat(sl.totalWeight) : undefined,
          setting:     sl.setting     || undefined,
          remarks:     sl.remarks     || undefined,
        }));

      // Build gold weights
      const goldWeights: Record<string, number> = {};
      if (form.goldWeightNine)      goldWeights.nineKt      = parseFloat(form.goldWeightNine);
      if (form.goldWeightFourteen)  goldWeights.fourteenKt  = parseFloat(form.goldWeightFourteen);
      if (form.goldWeightEighteen)  goldWeights.eighteenKt  = parseFloat(form.goldWeightEighteen);

      const body: Record<string, unknown> = {
        designNumber: form.designNumber.trim(),
        status:       'Pending Review',
        stoneLines,
      };
      if (form.category)                        body.category    = form.category;
      if (form.style.trim())                    body.style       = form.style.trim();
      if (form.size.trim())                     body.size        = form.size.trim();
      if (Object.keys(goldWeights).length)      body.goldWeights = goldWeights;
      if (form.cadImageUrl.trim())              body.cadImageUrl = form.cadImageUrl.trim();

      // 1. Create the product
      const res  = await fetch('/api/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create product');

      const newProductId = data._id as string;

      // 2. If from order mode: link this product back to the order
      if (fromOrderMode && productCode) {
        try {
          // Fetch the order to find the product index
          const orderRes = await fetch(`/api/orders/${fromOrder}`, { cache: 'no-store' });
          if (orderRes.ok) {
            const order = await orderRes.json();
            const idx = (order.products as Array<{ productCode: string }>)
              .findIndex(p => p.productCode === productCode);

            if (idx !== -1) {
              await fetch(`/api/orders/${fromOrder}/products/${idx}`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ productRef: newProductId, isNewProduct: false }),
              });
            }
          }
        } catch {
          // Non-fatal — product is created, order link failed silently
        }
      }

      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] p-8">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-[#6b6560] hover:text-[#1a1a1a] mb-6 group transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {fromOrderMode ? `Back to Order` : 'Back to Products'}
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-semibold text-[#1a1a1a]">New Product</h1>
          {fromOrderMode && (
            <p className="text-sm text-[#6b6560] mt-1">
              Adding to catalogue from order — product will be linked back automatically.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Core details ──────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-[#1a1a1a] text-sm uppercase tracking-wider text-[#6b6560]">Details</h2>

            {/* Design Number */}
            <div>
              <label className={label}>Design Number <span className="text-red-500">*</span></label>
              <input
                className={`${inp} ${productCode ? 'bg-[#f8f5f0] opacity-60 cursor-not-allowed' : ''}`}
                type="text"
                placeholder="e.g. P217"
                value={form.designNumber}
                onChange={e => !productCode && set('designNumber', e.target.value)}
                readOnly={!!productCode}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className={label}>Category</label>
                <select className={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div>
                <label className={label}>Style</label>
                <input className={inp} type="text" placeholder="e.g. Solitaire Ring"
                  value={form.style} onChange={e => set('style', e.target.value)} />
              </div>
            </div>

            {/* Size */}
            <div>
              <label className={label}>Size</label>
              <input className={inp} type="text" placeholder="e.g. 16 / 50mm"
                value={form.size} onChange={e => set('size', e.target.value)} />
            </div>

            {/* CAD Image URL */}
            <div>
              <label className={label}>CAD Image URL</label>
              <input className={inp} type="text" placeholder="https://drive.google.com/…"
                value={form.cadImageUrl} onChange={e => set('cadImageUrl', e.target.value)} />
            </div>
          </div>

          {/* ── Gold Weights ───────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-[#6b6560] text-sm uppercase tracking-wider">Gold Weights</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '9kt (g)',  key: 'goldWeightNine'      as const },
                { label: '14kt (g)', key: 'goldWeightFourteen'  as const },
                { label: '18kt (g)', key: 'goldWeightEighteen'  as const },
              ].map(f => (
                <div key={f.key}>
                  <label className={label}>{f.label}</label>
                  <input className={inp} type="number" min={0} step={0.001} placeholder="0.000"
                    value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Stone Lines ────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#6b6560] text-sm uppercase tracking-wider">Stone Lines</h2>
              <button
                type="button"
                onClick={() => set('stoneLines', [...form.stoneLines, { ...EMPTY_SL }])}
                className="text-sm text-[#456158] font-semibold hover:underline"
              >
                + Add Row
              </button>
            </div>

            {form.stoneLines.length === 0 ? (
              <p className="text-sm text-[#6b6560]/60 italic">No stone lines yet. Click "+ Add Row" to add one.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="bg-[#f8f5f0] text-[#6b6560]">
                      {['Shape','Size','Colour','Count','Total Wt','Setting','Remarks',''].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe3]">
                    {form.stoneLines.map((sl, i) => (
                      <tr key={i}>
                        <td className="px-1 py-1.5">
                          <input className="w-20 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                            placeholder="ROUND" value={sl.shape} onChange={e => updateSL(i, 'shape', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input className="w-16 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                            placeholder="1.30" value={sl.size} onChange={e => updateSL(i, 'size', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input className="w-16 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                            placeholder="WHITE" value={sl.colour} onChange={e => updateSL(i, 'colour', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input className="w-12 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158] text-right"
                            type="number" min={0} placeholder="0" value={sl.count}
                            onChange={e => updateSL(i, 'count', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input className="w-16 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158] text-right"
                            type="number" min={0} step={0.001} placeholder="0.000" value={sl.totalWeight}
                            onChange={e => updateSL(i, 'totalWeight', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input className="w-20 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                            placeholder="Prong" value={sl.setting}
                            onChange={e => updateSL(i, 'setting', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input className="w-24 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                            placeholder="Notes…" value={sl.remarks}
                            onChange={e => updateSL(i, 'remarks', e.target.value)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <button type="button"
                            onClick={() => set('stoneLines', form.stoneLines.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-600 p-0.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] active:bg-[#304340] transition-colors shadow-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page wrapper — Suspense required for useSearchParams ──────────────────────

export default function NewProductPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#f8f5f0]">
        <p className="text-[#6b6560]">Loading…</p>
      </div>
    }>
      <NewProductForm />
    </Suspense>
  );
}
