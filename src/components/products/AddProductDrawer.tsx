'use client';

import { useState, useEffect, useRef } from 'react';

// ── Category / style map ──────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, { code: string; styles: { label: string; code: string }[] }> = {
  Ring:               { code: 'RNG', styles: [{ label: 'Solitaire Ring', code: 'SOLR' }, { label: 'Two Stone Ring', code: 'TWOR' }, { label: 'Three Stone Ring', code: 'THRR' }, { label: 'Cocktail Ring', code: 'COKR' }, { label: 'Cocktail Ring with Colourstone', code: 'CSCR' }, { label: 'Fancy Ring', code: 'FANC' }, { label: 'Fancy Band', code: 'FBNR' }, { label: 'Band Ring', code: 'BAND' }, { label: 'Daily Ring', code: 'DALY' }] },
  Earrings:           { code: 'ERG', styles: [{ label: 'Stud', code: 'STUD' }, { label: 'Solitaire', code: 'SOLE' }, { label: 'Two Stone', code: 'TWOE' }, { label: 'Fancy', code: 'FANE' }, { label: 'Cocktail', code: 'COKE' }, { label: 'Colourstone', code: 'COLE' }, { label: 'Halo', code: 'HALE' }, { label: 'Cluster', code: 'CLUE' }, { label: 'Danglers', code: 'DANL' }, { label: 'Drop', code: 'DROP' }, { label: 'Long', code: 'LONG' }, { label: 'Hoops', code: 'HOOP' }, { label: 'Huggies', code: 'HUGG' }, { label: 'Jhumka', code: 'JHUM' }, { label: 'Chandbali', code: 'CHAN' }, { label: 'Ear Cuff', code: 'CUFF' }, { label: 'Ear Jacket', code: 'JACK' }] },
  Pendant:            { code: 'PDT', styles: [{ label: 'Solitaire', code: 'SOLP' }, { label: 'Two Stone', code: 'TWOP' }, { label: 'Fancy', code: 'FANP' }, { label: 'Cocktail', code: 'COKP' }, { label: 'Colourstone', code: 'COLP' }, { label: 'Daily', code: 'DAIL' }] },
  'Pendant Set':      { code: 'PDS', styles: [{ label: 'Solitaire', code: 'SOPS' }, { label: 'Two Stone', code: 'TWPS' }, { label: 'Fancy', code: 'FNPS' }, { label: 'Cocktail', code: 'COPS' }, { label: 'Colourstone', code: 'CLPS' }, { label: 'Floral', code: 'FLPS' }, { label: 'Halo', code: 'HLPS' }, { label: 'Cluster', code: 'CLST' }] },
  Necklace:           { code: 'NCK', styles: [{ label: 'Choker', code: 'CHKR' }, { label: 'Single Strand Tennis', code: 'SSTN' }, { label: 'Tennis', code: 'TENN' }, { label: 'Lariat', code: 'LART' }, { label: 'Collar', code: 'COLL' }, { label: 'Chain', code: 'CHNK' }, { label: 'Multi-line', code: 'MLNE' }, { label: 'Hasli Collar Choker', code: 'HCCN' }, { label: 'Fancy', code: 'FNNK' }] },
  'Necklace Earrings':{ code: 'NKE', styles: [{ label: 'Necklace Earrings', code: 'NECK' }] },
  Bracelet:           { code: 'BRC', styles: [{ label: 'Tennis', code: 'TENB' }, { label: 'Single Line', code: 'SLBR' }, { label: 'Station', code: 'STBR' }, { label: 'Oval Fancy', code: 'OVFB' }, { label: 'Solitaire Oval', code: 'SOVB' }, { label: 'Daily Oval', code: 'DOVB' }, { label: 'Fancy', code: 'FANB' }, { label: 'Cocktail', code: 'COKB' }, { label: 'Broad', code: 'BRDB' }, { label: 'Delicate', code: 'DELB' }, { label: 'Bangle', code: 'BNGL' }, { label: 'Kada', code: 'KADA' }, { label: 'Charm', code: 'CHRM' }] },
  'Chain Pendant':    { code: 'CHP', styles: [{ label: 'Hanging Pieces', code: 'HNGP' }, { label: 'Attached Pieces', code: 'ATCP' }, { label: 'With Colourstone', code: 'WCOL' }, { label: 'Gold Links', code: 'GLNK' }, { label: 'Station Chain', code: 'STCH' }, { label: 'Lariat', code: 'LART' }, { label: 'Mangalsutra', code: 'MNGL' }] },
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

// ── Size options ──────────────────────────────────────────────────────────────

const RING_SIZES = [
  '4','4.5','5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10','10.5',
  '11','11.5','12','12.5','13','13.5','14','14.5','15','15.5','16','16.5',
  '17','17.5','18','18.5','19','19.5','20','20.5','21','21.5','22','22.5',
  '23','23.5','24','24.5','25',
];
const BANGLE_SIZES = [
  '1.8 aana','1.9 aana','2.0 aana','2.1 aana','2.2 aana','2.3 aana',
  '2.4 aana','2.5 aana','2.6 aana','2.7 aana','2.8 aana','2.9 aana','2.10 aana',
];
const NECKLACE_SIZES = [
  '13"','14"','15"','16"','17"','18"','19"','20"',
  '21"','22"','23"','24"','25"','26"','27"','28"','29"','30"',
];

function getSizeType(category: string): 'ring' | 'bangle' | 'necklace' | 'free' {
  if (category === 'Ring')     return 'ring';
  if (category === 'Bracelet') return 'bangle';
  if (category === 'Necklace' || category === 'Necklace Earrings' || category === 'Chain Pendant') return 'necklace';
  return 'free';
}

function SizeSelector({ category, value, onChange }: {
  category: string; value: string; onChange: (v: string) => void;
}) {
  const type = getSizeType(category);
  if (type === 'ring') {
    return (
      <select className={inp} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select ring size…</option>
        {RING_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (type === 'bangle') {
    return (
      <select className={inp} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select size…</option>
        {BANGLE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (type === 'necklace') {
    return (
      <select className={inp} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select length…</option>
        {NECKLACE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  return (
    <input className={inp} type="text" placeholder="e.g. 50mm"
      value={value} onChange={e => onChange(e.target.value)} />
  );
}

const STATUSES = ['Pending Review', 'CAD Approved', 'Needs Manual Check', 'In Production', 'Made', 'Hold', 'Rejected'];
const STONE_TYPES = ['Diamond', 'Colourstone', 'Colored Diamond', 'Pearl'];
const SHAPES = ['ROUND','PEAR','MARQUISE','OVAL','PRINCESS','CUSHION','EMERALD','RADIANT','BAGUETTE','HEART','TRILLION','LOZENGE'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoneLine {
  stoneType: string;
  shape: string;
  sizeLength: string;
  sizeWidth: string;
  colour: string;
  count: string;
  totalWeight: string;
  setting: string;
  remarks: string;
}

interface FormState {
  designNumber: string;
  category: string;
  categoryCode: string;
  style: string;
  styleCode: string;
  queueCode: string;
  size: string;
  cadImageUrl: string;
  goldWeightNine: string;
  goldWeightFourteen: string;
  goldWeightEighteen: string;
  rhodiumInstruction: string;
  status: string;
  remarks: string;
  stoneLines: StoneLine[];
}

const EMPTY_LINE: StoneLine = { stoneType: '', shape: '', sizeLength: '', sizeWidth: '', colour: 'WHITE', count: '', totalWeight: '', setting: '', remarks: '' };

const EMPTY: FormState = {
  designNumber: '', category: '', categoryCode: '', style: '', styleCode: '', queueCode: '',
  size: '', cadImageUrl: '', goldWeightNine: '', goldWeightFourteen: '', goldWeightEighteen: '',
  rhodiumInstruction: '', status: 'Pending Review', remarks: '', stoneLines: [],
};

interface GaugeHint {
  caratPerStone: number;
  avgRatePerCt: number | null;
  isExact: boolean;
  matchedSizeStr: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ── Shared input styles ───────────────────────────────────────────────────────

const inp = 'w-full rounded-lg border border-[#ddd5c8] px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#6b6560]/50 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors';
const lbl = 'block text-xs font-medium text-[#6b6560] mb-1';
const ro  = 'w-full rounded-lg border border-[#e8e0d4] bg-[#f8f5f0] px-3 py-2 text-sm text-[#6b6560] select-none';

// ── Section header ────────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div className="pt-1 pb-3">
      <p className="text-[10px] font-bold text-gold uppercase tracking-[0.14em]">{title}</p>
    </div>
  );
}

// ── Stone line row with gauge lookup ─────────────────────────────────────────

function StoneLineRowAdd({
  sl, i, onUpdate, onRemove,
}: {
  sl: StoneLine;
  i: number;
  onUpdate: (i: number, f: keyof StoneLine, v: string) => void;
  onRemove: (i: number) => void;
}) {
  const [gauge, setGauge] = useState<GaugeHint | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  useEffect(() => {
    if (!sl.shape || !sl.sizeLength) { setGauge(null); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ shape: sl.shape, L: sl.sizeLength });
        if (sl.sizeWidth) p.set('W', sl.sizeWidth);
        const res = await fetch(`${base}/api/gauge/lookup?${p}`);
        if (!res.ok) return;
        setGauge(await res.json());
      } catch { /* network error */ }
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [sl.shape, sl.sizeLength, sl.sizeWidth, i, base]);

  useEffect(() => {
    if (!gauge) return;
    const cnt = parseInt(sl.count) || 0;
    onUpdateRef.current(i, 'totalWeight', (cnt * gauge.caratPerStone).toFixed(3));
  }, [sl.count, gauge, i]);

  const estCost = (() => {
    if (!gauge) return null;
    if (gauge.avgRatePerCt == null) return 'Cost N/A';
    const tw = parseFloat(sl.totalWeight) || 0;
    return `₹ ${Math.round(tw * gauge.avgRatePerCt).toLocaleString('en-IN')}`;
  })();

  const cell = 'px-1.5 py-1.5';
  const txt  = 'w-[68px] rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand';
  const num  = 'rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand';

  return (
    <>
      <tr>
        <td className={cell}>
          <select value={sl.stoneType} onChange={e => onUpdate(i, 'stoneType', e.target.value)}
            className="w-[118px] rounded border border-gray-200 px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand">
            <option value="">Type…</option>
            {STONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td className={cell}>
          <select value={sl.shape} onChange={e => onUpdate(i, 'shape', e.target.value)}
            className="w-[110px] rounded border border-gray-200 px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand">
            <option value="">—</option>
            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td className={cell}>
          <div className="flex items-center gap-0.5">
            <input type="number" min="0" step="0.01" placeholder="L"
              className="w-[48px] rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand"
              value={sl.sizeLength} onChange={e => onUpdate(i, 'sizeLength', e.target.value)} />
            <span className="text-gray-300 text-[10px] px-0.5">×</span>
            <input type="number" min="0" step="0.01" placeholder="W"
              className="w-[48px] rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand"
              value={sl.sizeWidth} onChange={e => onUpdate(i, 'sizeWidth', e.target.value)} />
          </div>
          {gauge && (
            <p className="text-[10px] text-gray-400 mt-0.5">{gauge.caratPerStone} ct/stone</p>
          )}
        </td>
        <td className={`${cell} text-right`}>
          {estCost && <span className="text-[10px] text-gray-500 whitespace-nowrap">{estCost}</span>}
        </td>
        <td className={cell}>
          <input type="text" placeholder="WHITE"
            className="w-[64px] rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand"
            value={sl.colour} onChange={e => onUpdate(i, 'colour', e.target.value.toUpperCase())} />
        </td>
        <td className={cell}><input type="number" min="0" step="1" className={`w-[52px] ${num}`} placeholder="0" value={sl.count} onChange={e => onUpdate(i, 'count', e.target.value)} /></td>
        <td className={cell}><input type="number" min="0" step="0.001" className={`w-[64px] ${num}`} placeholder="0.000" value={sl.totalWeight} onChange={e => onUpdate(i, 'totalWeight', e.target.value)} /></td>
        <td className={cell}><input type="text" className={txt} placeholder="—" value={sl.setting} onChange={e => onUpdate(i, 'setting', e.target.value)} /></td>
        <td className={cell}><input type="text" className={txt} placeholder="—" value={sl.remarks} onChange={e => onUpdate(i, 'remarks', e.target.value)} /></td>
        <td className="px-2 py-1.5 text-center">
          <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-400 transition-colors"><TrashIcon /></button>
        </td>
      </tr>
      {gauge && !gauge.isExact && (
        <tr>
          <td colSpan={10} className="px-3 pb-1.5 pt-0">
            <span className="inline-flex items-center text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
              Nearest match: {gauge.matchedSizeStr}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProductDrawer({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape key + body scroll lock
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handler);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  // Reset after close animation finishes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => { setForm(EMPTY); setError(null); }, 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  function buildQueueCode(dn: string, cc: string, sc: string): string {
    if (dn && cc && sc) return `${dn}-${cc}-${sc}`;
    if (dn && cc) return `${dn}-${cc}`;
    return cc;
  }

  function onDesignNumber(dn: string) {
    setForm(p => ({ ...p, designNumber: dn, queueCode: buildQueueCode(dn, p.categoryCode, p.styleCode) }));
  }

  function onCategory(cat: string) {
    const def = CATEGORY_MAP[cat];
    setForm(p => ({
      ...p,
      category: cat,
      categoryCode: def?.code ?? '',
      style: '',
      styleCode: '',
      size: '',
      queueCode: buildQueueCode(p.designNumber, def?.code ?? '', ''),
    }));
  }

  function onStyle(label: string) {
    const def = CATEGORY_MAP[form.category]?.styles.find(s => s.label === label);
    const sc = def?.code ?? '';
    setForm(p => ({
      ...p,
      style: label,
      styleCode: sc,
      queueCode: buildQueueCode(p.designNumber, p.categoryCode, sc),
    }));
  }

  function addLine() { set('stoneLines', [...form.stoneLines, { ...EMPTY_LINE }]); }
  function removeLine(i: number) { set('stoneLines', form.stoneLines.filter((_, idx) => idx !== i)); }
  function setLine(i: number, f: keyof StoneLine, v: string) {
    set('stoneLines', form.stoneLines.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.designNumber.trim()) { setError('Design Number is required.'); return; }
    setError(null);
    setSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
      const res = await fetch(`${base}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designNumber:          form.designNumber.trim(),
          category:              form.category || undefined,
          categoryCode:          form.categoryCode || undefined,
          style:                 form.style || undefined,
          styleCode:             form.styleCode || undefined,
          queueCode:             form.queueCode || undefined,
          size: form.size || undefined,
          cadImageUrl:           form.cadImageUrl.trim() || undefined,
          goldWeights: {
            nineKt:     form.goldWeightNine     ? parseFloat(form.goldWeightNine)     : undefined,
            fourteenKt: form.goldWeightFourteen ? parseFloat(form.goldWeightFourteen) : undefined,
            eighteenKt: form.goldWeightEighteen ? parseFloat(form.goldWeightEighteen) : undefined,
          },
          rhodiumInstruction:    form.rhodiumInstruction.trim() || undefined,
          status:                form.status,
          remarks:               form.remarks.trim() || undefined,
          stoneLines: form.stoneLines
            .filter(l => l.stoneType)
            .map(l => ({
              stoneType:   l.stoneType,
              shape:       l.shape || undefined,
              size:        l.sizeLength
                ? (l.sizeWidth
                    ? `${parseFloat(l.sizeLength).toFixed(2)}X${parseFloat(l.sizeWidth).toFixed(2)}`
                    : parseFloat(l.sizeLength).toFixed(2))
                : undefined,
              colour:      l.colour || 'WHITE',
              count:       l.count ? parseInt(l.count) : undefined,
              totalWeight: l.totalWeight ? parseFloat(l.totalWeight) : undefined,
              setting:     l.setting || undefined,
              remarks:     l.remarks || undefined,
            })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? 'Failed to create product');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setSaving(false);
    }
  }

  const availableStyles = CATEGORY_MAP[form.category]?.styles ?? [];

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="Add Product"
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 'min(600px, 100vw)' }}
      >
        {/* Green accent bar */}
        <div className="h-1 bg-brand shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0ebe3] shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#1a1a1a]">Add Product</h2>
            <p className="text-xs text-[#6b6560] mt-0.5">All fields except Design Number are optional</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#f0ebe3] transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <form id="add-product" onSubmit={submit} noValidate className="space-y-1">

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* ── Identity ─────────────────────────────────────────────── */}
            <Section title="Identity" />

            <div className="space-y-3 mb-5">
              {/* Design Number */}
              <div>
                <label className={lbl}>Design Number <span className="text-red-500">*</span></label>
                <input className={inp} type="text" placeholder="e.g. P001"
                  value={form.designNumber} onChange={e => onDesignNumber(e.target.value.toUpperCase())} />
              </div>

              {/* Category + code */}
              <div className="grid grid-cols-[1fr_88px] gap-3">
                <div>
                  <label className={lbl}>Category</label>
                  <select className={inp} value={form.category} onChange={e => onCategory(e.target.value)}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Code</label>
                  <div className={`${ro} font-mono tracking-wider`}>{form.categoryCode || '—'}</div>
                </div>
              </div>

              {/* Style + code */}
              <div className="grid grid-cols-[1fr_88px] gap-3">
                <div>
                  <label className={lbl}>Style</label>
                  <select className={`${inp} disabled:opacity-50 disabled:cursor-not-allowed`}
                    value={form.style} onChange={e => onStyle(e.target.value)} disabled={!form.category}>
                    <option value="">Select style…</option>
                    {availableStyles.map(s => <option key={s.code} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Code</label>
                  <div className={`${ro} font-mono tracking-wider`}>{form.styleCode || '—'}</div>
                </div>
              </div>

              {/* Queue Code */}
              <div>
                <label className={lbl}>Queue Code</label>
                <div className={`${ro} font-mono tracking-widest text-gray-500`}>{form.queueCode || '—'}</div>
              </div>

              {/* Size */}
              <div>
                <label className={lbl}>Size</label>
                <SizeSelector category={form.category} value={form.size} onChange={v => set('size', v)} />
              </div>

              {/* CAD Image URL */}
              <div>
                <label className={lbl}>CAD Image URL</label>
                <input className={inp} type="text" placeholder="https://drive.google.com/file/d/…/view"
                  value={form.cadImageUrl} onChange={e => set('cadImageUrl', e.target.value)} />
                <p className="mt-1 text-[11px] text-gray-400">
                  File sharing must be set to <span className="font-medium text-gray-500">"Anyone with the link"</span> in Google Drive for the image to display.
                </p>
              </div>
            </div>

            {/* ── Gold & Stones ─────────────────────────────────────────── */}
            <div className="border-t border-[#f0ebe3] pt-5">
              <Section title="Gold & Stones" />
            </div>

            <div className="space-y-3 mb-5">
              {/* Gold Weights */}
              <div>
                <label className={lbl}>Gold Weight (g)</label>
                <div className="rounded-lg border border-[#ddd5c8] overflow-hidden">
                  {([['9KT', 'goldWeightNine'], ['14KT', 'goldWeightFourteen'], ['18KT', 'goldWeightEighteen']] as const).map(([label, field]) => (
                    <div key={label} className="flex items-center border-b border-[#f0ebe3] last:border-0">
                      <span className="w-14 shrink-0 pl-3 text-xs font-semibold text-[#6b6560]">{label}</span>
                      <input className="flex-1 py-2 px-2.5 text-sm bg-white focus:outline-none focus:bg-brand/[0.03] border-l border-[#f0ebe3]"
                        type="number" min="0" step="0.001" placeholder="—"
                        value={form[field]} onChange={e => set(field, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Production ────────────────────────────────────────────── */}
            <div className="border-t border-[#f0ebe3] pt-5">
              <Section title="Production" />
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className={lbl}>Rhodium Instruction</label>
                <input className={inp} type="text" placeholder="e.g. Full rhodium, No rhodium, Partial"
                  value={form.rhodiumInstruction} onChange={e => set('rhodiumInstruction', e.target.value)} />
              </div>

              <div>
                <label className={lbl}>Status</label>
                <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={lbl}>Remarks</label>
                <textarea className={`${inp} resize-none`} rows={3}
                  placeholder="Any notes or comments…"
                  value={form.remarks} onChange={e => set('remarks', e.target.value)} />
              </div>
            </div>

            {/* ── Stone Lines ───────────────────────────────────────────── */}
            <div className="border-t border-[#f0ebe3] pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gold uppercase tracking-[0.14em]">Stone Lines</p>
                <button type="button" onClick={addLine}
                  className="text-xs font-medium text-brand hover:text-brand/70 transition-colors">
                  + Add Row
                </button>
              </div>

              {form.stoneLines.length === 0 ? (
                <button type="button" onClick={addLine}
                  className="w-full py-4 border border-dashed border-[#ddd5c8] rounded-lg text-xs text-[#6b6560] hover:border-brand/40 hover:text-brand/70 transition-colors">
                  + Add a stone line
                </button>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-[#ddd5c8]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[#f0ebe3] text-left text-[#6b6560]">
                          <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Stone Type</th>
                          <th className="px-2.5 py-2 font-semibold">Shape</th>
                          <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Size (L×W)</th>
                          <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Est. Cost</th>
                          <th className="px-2.5 py-2 font-semibold">Colour</th>
                          <th className="px-2.5 py-2 font-semibold">Count</th>
                          <th className="px-2.5 py-2 font-semibold whitespace-nowrap">Total Wt ct</th>
                          <th className="px-2.5 py-2 font-semibold">Setting</th>
                          <th className="px-2.5 py-2 font-semibold">Remarks</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.stoneLines.map((sl, i) => (
                          <StoneLineRowAdd key={i} sl={sl} i={i} onUpdate={setLine} onRemove={removeLine} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addLine}
                    className="mt-2 w-full py-2 text-xs font-semibold text-brand border border-dashed border-brand/30 rounded-lg hover:bg-brand/5 transition-colors">
                    + Add Row
                  </button>
                </>
              )}

              {/* Calculated totals */}
              {(() => {
                const DIA = new Set(['Diamond', 'Colored Diamond']);
                const COL = new Set(['Colourstone', 'Pearl']);
                const dLines = form.stoneLines.filter(l => DIA.has(l.stoneType));
                const cLines = form.stoneLines.filter(l => COL.has(l.stoneType));
                if (!dLines.length && !cLines.length) return null;
                const dWeight = dLines.reduce((s, l) => s + (parseFloat(l.totalWeight) || 0), 0);
                const dPcs    = dLines.reduce((s, l) => s + (parseInt(l.count) || 0), 0);
                const cWeight = cLines.reduce((s, l) => s + (parseFloat(l.totalWeight) || 0), 0);
                const cPcs    = cLines.reduce((s, l) => s + (parseInt(l.count) || 0), 0);
                return (
                  <div className="mt-3 pt-3 border-t border-[#f0ebe3]">
                    <p className="text-[10px] font-bold text-gold uppercase tracking-[0.14em] mb-2">Calculated Totals</p>
                    <div className="grid grid-cols-2 gap-2">
                      {dLines.length > 0 && <>
                        <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#6b6560] mb-0.5">Diamond Weight</p>
                          <p className="text-sm font-semibold text-[#1a1a1a]">{dWeight.toFixed(3)} ct</p>
                        </div>
                        <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#6b6560] mb-0.5">Diamond Pcs</p>
                          <p className="text-sm font-semibold text-[#1a1a1a]">{dPcs}</p>
                        </div>
                      </>}
                      {cLines.length > 0 && <>
                        <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#6b6560] mb-0.5">Colourstone Weight</p>
                          <p className="text-sm font-semibold text-[#1a1a1a]">{cWeight.toFixed(3)} ct</p>
                        </div>
                        <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-[#6b6560] mb-0.5">Colourstone Pcs</p>
                          <p className="text-sm font-semibold text-[#1a1a1a]">{cPcs}</p>
                        </div>
                      </>}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* bottom breathing room */}
            <div className="h-8" />
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f0ebe3] bg-white">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#6b6560] bg-white border border-[#ddd5c8] rounded-lg hover:bg-[#f8f5f0] transition-colors">
            Cancel
          </button>
          <button type="submit" form="add-product" disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Add Product
          </button>
        </div>
      </div>
    </>
  );
}
