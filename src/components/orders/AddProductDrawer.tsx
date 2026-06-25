'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VersionStoneLine {
  shape?: string; size?: string; colour?: string; count?: number;
}

interface ProductVersion {
  _id: string; versionNumber: number; name?: string; size?: string;
  stoneLines?: VersionStoneLine[];
}

interface CatalogueProduct {
  _id:          string;
  designNumber: string;
  category?:    string;
  style?:       string;
  stoneLines?:  VersionStoneLine[];
  versions?:    ProductVersion[];
}

interface LocalStoneLine {
  shape: string; size: string; colour: string; piecesPerUnit: string;
}

type Stage       = 'cad' | 'diamond_procurement' | 'manufacturing' | 'order_received';
type GoldColour  = 'yellow' | 'white' | 'rose';
type GoldCarat   = '9kt' | '14kt' | '18kt';
type VersionMode = 'base' | 'existing' | 'new';

interface FormState {
  productCode:           string;
  isNewProduct:          boolean;
  newProductDescription: string;
  quantity:              string;
  goldColour:            GoldColour | '';
  goldCarat:             GoldCarat  | '';
  findings:              string;
  stoneLines:            LocalStoneLine[];
  stage:                 Stage;
  remarks:               string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  productCode: '', isNewProduct: false, newProductDescription: '',
  quantity: '1', goldColour: '', goldCarat: '',
  findings: '', stoneLines: [], stage: 'cad', remarks: '',
};

const EMPTY_SL: LocalStoneLine = { shape: '', size: '', colour: 'WHITE', piecesPerUnit: '' };

const STAGES: { value: Stage; label: string }[] = [
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

const inp = 'w-full px-3 py-2 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a]';
const slabel = 'block text-xs font-semibold text-[#6b6560] uppercase tracking-wider';

// ── Shared stone lines table ───────────────────────────────────────────────────

function StoneLinesTable({ lines, qty, onChange }: {
  lines:    LocalStoneLine[];
  qty:      number;
  onChange: (l: LocalStoneLine[]) => void;
}) {
  function upd(i: number, field: keyof LocalStoneLine, val: string) {
    onChange(lines.map((sl, idx) => idx === i ? { ...sl, [field]: val } : sl));
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={slabel}>Stone Lines</span>
        <button type="button" onClick={() => onChange([...lines, { ...EMPTY_SL }])}
          className="text-xs text-[#456158] font-semibold hover:underline">+ Add Row</button>
      </div>
      {lines.length > 0 && (
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
              {lines.map((sl, i) => {
                const total = sl.piecesPerUnit && qty > 0 ? parseInt(sl.piecesPerUnit) * qty : null;
                return (
                  <tr key={i}>
                    <td className="px-1 py-1">
                      <input className="w-full px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                        placeholder="ROUND" value={sl.shape} onChange={e => upd(i, 'shape', e.target.value)} />
                    </td>
                    <td className="px-1 py-1">
                      <input className="w-full px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                        placeholder="1.30" value={sl.size} onChange={e => upd(i, 'size', e.target.value)} />
                    </td>
                    <td className="px-1 py-1">
                      <input className="w-full px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158]"
                        placeholder="WHITE" value={sl.colour} onChange={e => upd(i, 'colour', e.target.value)} />
                    </td>
                    <td className="px-1 py-1">
                      <input className="w-14 px-1.5 py-1 text-xs border border-[#ddd5c8] rounded focus:outline-none focus:border-[#456158] text-right"
                        type="number" min={0} placeholder="0" value={sl.piecesPerUnit}
                        onChange={e => upd(i, 'piecesPerUnit', e.target.value)} />
                    </td>
                    <td className="px-2 py-1 text-right font-semibold text-[#456158]">{total ?? '—'}</td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => onChange(lines.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
                        </svg>
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
  );
}

// ── Helper: map product/version stone lines to local format ───────────────────

function toLocalLines(lines?: VersionStoneLine[]): LocalStoneLine[] {
  return (lines ?? []).map(sl => ({
    shape:         sl.shape  ?? '',
    size:          sl.size   ?? '',
    colour:        sl.colour ?? 'WHITE',
    piecesPerUnit: sl.count != null ? String(sl.count) : '',
  }));
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface Props {
  open:      boolean;
  orderId:   string;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function AddProductToOrderDrawer({ open, orderId, onClose, onSuccess }: Props) {
  const router = useRouter();

  // ── Core form ───────────────────────────────────────────────────────────────
  const [form, setForm]   = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Catalogue search ────────────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct]   = useState<CatalogueProduct | null>(null);
  const [catalogueSearch, setCatalogueSearch]   = useState('');
  const [catalogueResults, setCatalogueResults] = useState<CatalogueProduct[]>([]);
  const [showDropdown, setShowDropdown]         = useState(false);
  const dropdownRef                             = useRef<HTMLDivElement>(null);

  // ── New product flow ────────────────────────────────────────────────────────
  const [autoNumber, setAutoNumber]         = useState('');
  const [fetchingNumber, setFetchingNumber] = useState(false);

  // ── Version selection ───────────────────────────────────────────────────────
  const [versionMode, setVersionMode]             = useState<VersionMode>('base');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [newVersionName, setNewVersionName]       = useState('');
  const [newVersionSize, setNewVersionSize]       = useState('');
  const [newVersionLines, setNewVersionLines]     = useState<LocalStoneLine[]>([]);

  // ── Auto-fetch next design number when isNewProduct is toggled on ───────────
  useEffect(() => {
    if (!form.isNewProduct) { setAutoNumber(''); return; }
    setFetchingNumber(true);
    fetch('/api/products/next-number')
      .then(r => r.json())
      .then(data => {
        const num: string = data.nextNumber ?? '';
        setAutoNumber(num);
        setForm(prev => ({ ...prev, productCode: num }));
      })
      .catch(() => {})
      .finally(() => setFetchingNumber(false));
  }, [form.isNewProduct]);

  // ── Debounced catalogue search ──────────────────────────────────────────────
  useEffect(() => {
    if (!catalogueSearch.trim()) { setCatalogueResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(catalogueSearch)}&limit=20&page=1`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setCatalogueResults(data.products ?? []);
        setShowDropdown(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [catalogueSearch]);

  // ── Close catalogue dropdown on outside click ───────────────────────────────
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Select product from catalogue — fetches full record for stoneLines/versions
  async function selectProduct(partial: CatalogueProduct) {
    setShowDropdown(false);
    setCatalogueSearch(partial.designNumber);
    setSelectedProduct(partial);
    resetVersionState();

    try {
      const res = await fetch(`/api/products/${partial._id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const full: CatalogueProduct = await res.json();
      setSelectedProduct(full);
      // Default: use base product stone lines
      setForm(prev => ({
        ...prev,
        productCode: prev.productCode || full.designNumber,
        stoneLines:  toLocalLines(full.stoneLines),
      }));
    } catch { /* ignore — partial product still set */ }
  }

  function resetVersionState() {
    setVersionMode('base');
    setSelectedVersionId('');
    setNewVersionName('');
    setNewVersionSize('');
    setNewVersionLines([]);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const qty = parseInt(form.quantity) || 0;

  // ── Version mode switching ──────────────────────────────────────────────────
  function handleVersionModeChange(mode: VersionMode) {
    setVersionMode(mode);
    setSelectedVersionId('');
    if (mode === 'base' && selectedProduct) {
      setForm(prev => ({ ...prev, stoneLines: toLocalLines(selectedProduct.stoneLines) }));
    } else if (mode === 'new') {
      setForm(prev => ({ ...prev, stoneLines: [] }));
      setNewVersionLines([]);
    }
  }

  function handleVersionSelect(versionId: string) {
    setSelectedVersionId(versionId);
    const v = selectedProduct?.versions?.find(v => v._id === versionId);
    if (v) setForm(prev => ({ ...prev, stoneLines: toLocalLines(v.stoneLines) }));
  }

  // ── Reset everything ────────────────────────────────────────────────────────
  function resetAll() {
    setForm(EMPTY_FORM);
    setSelectedProduct(null);
    setCatalogueSearch('');
    setCatalogueResults([]);
    setAutoNumber('');
    setError(null);
    resetVersionState();
  }

  function handleClose() { resetAll(); onClose(); }

  // ── Validation shared between all submit paths ──────────────────────────────
  function validate(): string | null {
    if (!form.productCode.trim()) return 'Product Code is required.';
    if (qty < 1)                  return 'Quantity must be at least 1.';
    if (!form.goldColour)         return 'Gold Colour is required.';
    if (!form.goldCarat)          return 'Gold Carat is required.';
    return null;
  }

  // ── "Fill Details Now" — post stub so /products/new can link back ────────────
  async function handleFillNow() {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      const stubBody: Record<string, unknown> = {
        productCode:  autoNumber || form.productCode,
        isNewProduct: true,
        quantity:     qty,
        goldColour:   form.goldColour,
        goldCarat:    form.goldCarat,
        stage:        'cad',
        stoneLines:   [],
      };
      if (form.newProductDescription.trim()) stubBody.newProductDescription = form.newProductDescription.trim();

      const res = await fetch(`/api/orders/${orderId}/products`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(stubBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to reserve product slot');

      onSuccess();
      router.push(`/products/new?fromOrder=${orderId}&productCode=${encodeURIComponent(autoNumber || form.productCode)}`);
      resetAll();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  // ── "Fill Details Later" — post minimal stub, close drawer ──────────────────
  async function handleFillLater() {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        productCode:  autoNumber || form.productCode,
        isNewProduct: true,
        quantity:     qty,
        goldColour:   form.goldColour,
        goldCarat:    form.goldCarat,
        stage:        'cad',
        stoneLines:   [],
      };
      if (form.newProductDescription.trim()) body.newProductDescription = form.newProductDescription.trim();

      const res = await fetch(`/api/orders/${orderId}/products`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to add product');

      resetAll();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // ── Normal submit (existing product, with optional version creation) ─────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      let finalStoneLines = form.stoneLines;

      // If creating a new version, POST it first and use the returned stone lines
      if (versionMode === 'new' && selectedProduct) {
        const vPayload = {
          name:       newVersionName.trim() || undefined,
          size:       newVersionSize.trim() || undefined,
          stoneLines: newVersionLines
            .filter(sl => sl.shape || sl.size || sl.piecesPerUnit)
            .map(sl => ({
              shape:  sl.shape  || undefined,
              size:   sl.size   || undefined,
              colour: sl.colour || 'WHITE',
              count:  sl.piecesPerUnit ? parseInt(sl.piecesPerUnit) : undefined,
            })),
        };
        const vRes = await fetch(`/api/products/${selectedProduct._id}/versions`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(vPayload),
        });
        const vData = await vRes.json();
        if (!vRes.ok) throw new Error(vData.message ?? 'Failed to create version');

        // The returned product has all versions; pick the newly added one (highest number)
        const versions = vData.versions as ProductVersion[];
        const newV = versions.reduce((a, b) => a.versionNumber > b.versionNumber ? a : b);
        finalStoneLines = toLocalLines(newV.stoneLines);
      }

      const body: Record<string, unknown> = {
        productCode:  form.productCode.trim(),
        isNewProduct: form.isNewProduct,
        quantity:     qty,
        goldColour:   form.goldColour,
        goldCarat:    form.goldCarat,
        stage:        form.stage,
        stoneLines:   finalStoneLines.map(sl => ({
          shape:        sl.shape  || undefined,
          size:         sl.size   || undefined,
          colour:       sl.colour || 'WHITE',
          piecesPerUnit: sl.piecesPerUnit ? parseInt(sl.piecesPerUnit) : undefined,
          totalPieces:  sl.piecesPerUnit && qty > 0 ? parseInt(sl.piecesPerUnit) * qty : undefined,
        })),
      };
      if (selectedProduct)                                       body.productRef = selectedProduct._id;
      if (form.isNewProduct && form.newProductDescription.trim()) body.newProductDescription = form.newProductDescription.trim();
      if (form.findings.trim()) body.findings = form.findings.trim();
      if (form.remarks.trim())  body.remarks  = form.remarks.trim();

      const res = await fetch(`/api/orders/${orderId}/products`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to add product');

      resetAll();
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const isNewMode = form.isNewProduct;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />}

      <div className={`fixed top-0 right-0 h-full w-[440px] bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8e0d4]">
          <h2 className="font-playfair text-xl font-semibold text-[#1a1a1a]">Add Product</h2>
          <button type="button" onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0ebe3] text-[#6b6560] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Is New Product ──────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input id="isNew" type="checkbox" checked={form.isNewProduct}
                onChange={e => set('isNewProduct', e.target.checked)}
                className="w-4 h-4 rounded border-[#ddd5c8] accent-[#456158]" />
              <label htmlFor="isNew" className="text-sm text-[#1a1a1a] select-none cursor-pointer">
                New product (not in catalogue)
              </label>
            </div>
            {isNewMode && (
              <textarea className={`${inp} resize-none`} rows={2}
                placeholder="Brief description…" value={form.newProductDescription}
                onChange={e => set('newProductDescription', e.target.value)} />
            )}
          </div>

          {/* ── Catalogue search (hidden in new-product mode) ────────── */}
          {!isNewMode && (
            <div className="space-y-1.5">
              <label className={slabel}>Link to Catalogue (optional)</label>
              <div ref={dropdownRef} className="relative">
                <input className={inp} type="text" placeholder="Search by design number…"
                  value={catalogueSearch}
                  onChange={e => { setCatalogueSearch(e.target.value); setSelectedProduct(null); }}
                  onFocus={() => catalogueResults.length > 0 && setShowDropdown(true)}
                />
                {showDropdown && catalogueResults.length > 0 && (
                  <ul className="absolute z-50 mt-1 left-0 w-full max-h-48 overflow-y-auto bg-white rounded-lg border border-[#e8e0d4] shadow-lg py-1 list-none">
                    {catalogueResults.map(p => (
                      <li key={p._id}>
                        <button type="button"
                          onMouseDown={e => { e.preventDefault(); selectProduct(p); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0ebe3] transition-colors">
                          <span className="font-medium text-[#1a1a1a]">{p.designNumber}</span>
                          {p.category && (
                            <span className="text-[#6b6560] ml-2 text-xs">
                              {p.category}{p.style ? ` · ${p.style}` : ''}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedProduct && (
                <p className="text-xs text-[#456158] font-semibold">✓ Linked to {selectedProduct.designNumber}</p>
              )}
            </div>
          )}

          {/* ── Version selection (only when a catalogue product is selected) ── */}
          {!isNewMode && selectedProduct && (
            <div className="bg-[#f8f5f0] rounded-lg p-4 space-y-3">
              <p className={slabel}>Which version?</p>

              <div className="space-y-2">
                {(
                  [
                    { value: 'base',     label: 'Use base product'   },
                    { value: 'existing', label: 'Use existing version'},
                    { value: 'new',      label: 'Create new version'  },
                  ] as { value: VersionMode; label: string }[]
                ).map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="versionMode" value={opt.value}
                      checked={versionMode === opt.value}
                      onChange={() => handleVersionModeChange(opt.value)}
                      className="accent-[#456158]" />
                    <span className="text-sm text-[#1a1a1a]">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Existing version — dropdown */}
              {versionMode === 'existing' && (
                <div className="pt-1">
                  {selectedProduct.versions?.length ? (
                    <select className={inp} value={selectedVersionId} onChange={e => handleVersionSelect(e.target.value)}>
                      <option value="">— Select a version —</option>
                      {selectedProduct.versions.map(v => (
                        <option key={v._id} value={v._id}>
                          V{v.versionNumber}{v.name ? ` — ${v.name}` : ''}{v.size ? ` (${v.size})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-[#6b6560] italic">No saved versions for this product yet.</p>
                  )}
                </div>
              )}

              {/* New version — inline form */}
              {versionMode === 'new' && (
                <div className="space-y-3 pt-2 border-t border-[#e8e0d4]">
                  <p className="text-[11px] text-[#6b6560] italic">
                    This version will be saved to the catalogue on submit.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={slabel}>Version Name</label>
                      <input className={inp} type="text" placeholder="e.g. Rose Gold"
                        value={newVersionName} onChange={e => setNewVersionName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className={slabel}>Size</label>
                      <input className={inp} type="text" placeholder="e.g. 16"
                        value={newVersionSize} onChange={e => setNewVersionSize(e.target.value)} />
                    </div>
                  </div>
                  <StoneLinesTable lines={newVersionLines} qty={qty} onChange={setNewVersionLines} />
                </div>
              )}
            </div>
          )}

          {/* ── Product Code ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className={slabel}>Product Code <span className="text-red-500">*</span></label>
            {isNewMode ? (
              <div className="relative">
                <input
                  className={`${inp} bg-[#f8f5f0] opacity-70 cursor-not-allowed`}
                  type="text"
                  value={fetchingNumber ? 'Loading…' : (autoNumber || form.productCode)}
                  readOnly
                />
                {fetchingNumber && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-3.5 h-3.5 animate-spin text-[#456158]" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                        strokeDasharray="31.4" strokeDashoffset="10" />
                    </svg>
                  </span>
                )}
              </div>
            ) : (
              <input className={inp} type="text" placeholder="e.g. P200"
                value={form.productCode} onChange={e => set('productCode', e.target.value)} />
            )}
          </div>

          {/* ── Quantity ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className={slabel}>Quantity <span className="text-red-500">*</span></label>
            <input className={inp} type="number" min={1} placeholder="1"
              value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </div>

          {/* ── Gold Colour ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className={slabel}>Gold Colour <span className="text-red-500">*</span></label>
            <div className="flex rounded-lg border border-[#ddd5c8] overflow-hidden">
              {GOLD_COLOURS.map(c => (
                <button key={c.value} type="button" onClick={() => set('goldColour', c.value)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.goldColour === c.value ? 'bg-[#456158] text-white' : 'bg-white text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Gold Carat ───────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className={slabel}>Gold Carat <span className="text-red-500">*</span></label>
            <div className="flex rounded-lg border border-[#ddd5c8] overflow-hidden">
              {GOLD_CARATS.map(c => (
                <button key={c} type="button" onClick={() => set('goldCarat', c)}
                  className={`flex-1 py-2 text-sm font-medium uppercase transition-colors ${form.goldCarat === c ? 'bg-[#456158] text-white' : 'bg-white text-[#6b6560] hover:bg-[#f0ebe3]'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* ── Findings (hidden in new-product mode) ───────────────── */}
          {!isNewMode && (
            <div className="space-y-1.5">
              <label className={slabel}>Findings</label>
              <input className={inp} type="text" placeholder="e.g. peg head, push back"
                value={form.findings} onChange={e => set('findings', e.target.value)} />
            </div>
          )}

          {/* ── Stone Lines (shown for base/existing version, hidden when creating new version) */}
          {!isNewMode && versionMode !== 'new' && (
            <StoneLinesTable lines={form.stoneLines} qty={qty}
              onChange={lines => set('stoneLines', lines)} />
          )}

          {/* ── Stage ────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className={slabel}>Stage</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGES.map(s => (
                <button key={s.value} type="button" onClick={() => set('stage', s.value)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${form.stage === s.value ? 'bg-[#456158] text-white border-[#456158]' : 'bg-white text-[#6b6560] border-[#ddd5c8] hover:bg-[#f0ebe3]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Remarks (hidden in new-product mode) ────────────────── */}
          {!isNewMode && (
            <div className="space-y-1.5">
              <label className={slabel}>Remarks</label>
              <textarea className={`${inp} resize-none`} rows={2} placeholder="Product-specific notes…"
                value={form.remarks} onChange={e => set('remarks', e.target.value)} />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e0d4] space-y-2">
          {isNewMode ? (
            <>
              <button type="button" onClick={handleFillNow} disabled={saving || fetchingNumber}
                className="w-full py-2.5 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Fill Details Now →'}
              </button>
              <button type="button" onClick={handleFillLater} disabled={saving || fetchingNumber}
                className="w-full py-2.5 bg-white border border-[#ddd5c8] text-[#1a1a1a] text-sm font-semibold rounded-lg hover:bg-[#f0ebe3] transition-colors disabled:opacity-60">
                Fill Details Later
              </button>
            </>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="w-full py-2.5 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] transition-colors disabled:opacity-60">
              {saving ? 'Adding…' : 'Add Product'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
