'use client';

import { useState, useEffect } from 'react';

// ── Category reference data ───────────────────────────────────────────────────

const CATEGORY_REF = [
  {
    name: 'Ring', code: 'RNG',
    styles: ['Solitaire Ring', 'Two Stone Ring', 'Three Stone Ring', 'Cocktail Ring', 'Cocktail Ring with Colourstone', 'Fancy Ring', 'Fancy Band', 'Band Ring', 'Daily Ring'],
  },
  {
    name: 'Earrings', code: 'ERG',
    styles: ['Stud', 'Solitaire', 'Two Stone', 'Fancy', 'Cocktail', 'Colourstone', 'Halo', 'Cluster', 'Danglers', 'Drop', 'Long', 'Hoops', 'Huggies', 'Jhumka', 'Chandbali', 'Ear Cuff', 'Ear Jacket'],
  },
  {
    name: 'Pendant', code: 'PDT',
    styles: ['Solitaire', 'Two Stone', 'Fancy', 'Cocktail', 'Colourstone', 'Daily'],
  },
  {
    name: 'Pendant Earrings', code: 'PDE',
    styles: ['Solitaire', 'Two Stone', 'Fancy', 'Cocktail', 'Colourstone', 'Floral', 'Halo', 'Cluster'],
  },
  {
    name: 'Necklace', code: 'NCK',
    styles: ['Choker', 'Single Strand Tennis', 'Tennis', 'Lariat', 'Collar', 'Chain', 'Multi-line', 'Hasli Collar Choker', 'Fancy'],
  },
  {
    name: 'Necklace Earrings', code: 'NKE',
    styles: ['Necklace Earrings'],
  },
  {
    name: 'Bracelet', code: 'BRC',
    styles: ['Tennis', 'Single Line', 'Station', 'Oval Fancy', 'Solitaire Oval', 'Daily Oval', 'Fancy', 'Cocktail', 'Broad', 'Delicate', 'Bangle', 'Kada', 'Charm'],
  },
  {
    name: 'Chain Pendant', code: 'CHP',
    styles: ['Hanging Pieces', 'Attached Pieces', 'With Colourstone', 'Gold Links', 'Station Chain', 'Lariat', 'Mangalsutra'],
  },
];

// ── Delete actions ────────────────────────────────────────────────────────────

interface DeleteAction {
  id:          string;
  label:       string;
  description: string;
  collection:  'orders' | 'products' | 'diamond_gauge';
}

const DELETE_ACTIONS: DeleteAction[] = [
  {
    id: 'orders', label: 'Delete All Orders',
    description: 'Permanently removes all orders and their product lists',
    collection: 'orders',
  },
  {
    id: 'products', label: 'Delete All Products',
    description: 'Permanently removes all products, stone lines and versions',
    collection: 'products',
  },
  {
    id: 'diamond_gauge', label: 'Delete All Gauge Entries',
    description: 'Permanently removes all diamond gauge data',
    collection: 'diamond_gauge',
  },
];

// ── Delete row component ──────────────────────────────────────────────────────

function DeleteRow({ action }: { action: DeleteAction }) {
  const [confirming, setConfirming] = useState(false);
  const [inputVal, setInputVal]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');

  async function handleConfirm() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/settings/delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ collection: action.collection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to delete');
      setResult('success');
      setConfirming(false);
      setInputVal('');
    } catch (err) {
      setResult('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setConfirming(false);
    setInputVal('');
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6 py-4 border-t border-red-100 first:border-t-0">
      <div className="min-w-0">
        <p className="font-semibold text-[#1a1a1a]">{action.label}</p>
        <p className="text-sm text-[#6b6560] mt-0.5">{action.description}</p>
        {result === 'success' && (
          <p className="text-sm text-green-600 mt-1.5 font-medium">Deleted successfully</p>
        )}
        {result === 'error' && (
          <p className="text-sm text-red-600 mt-1.5">{errorMsg}</p>
        )}
      </div>

      <div className="shrink-0">
        {!confirming ? (
          <button
            type="button"
            onClick={() => { setConfirming(true); setResult(null); }}
            className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        ) : (
          <div className="flex flex-col gap-2 items-stretch sm:items-end">
            <p className="text-xs text-[#6b6560]">Type &ldquo;DELETE&rdquo; to confirm</p>
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="DELETE"
              autoFocus
              className="px-3 py-1.5 text-sm border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 w-36"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-[#6b6560] border border-[#ddd5c8] rounded-lg hover:bg-[#f8f5f0] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={inputVal !== 'DELETE' || loading}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Deleting…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product Styles ────────────────────────────────────────────────────────────

const STYLE_CATEGORIES = [
  'Ring', 'Earrings', 'Pendant', 'Necklace', 'Bracelet',
  'Pendant Earrings', 'Necklace Earrings', 'Chain Pendant',
];

function StylePill({ category, style, onRemoved }: {
  category: string;
  style:    string;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function remove() {
    if (removing) return;
    setRemoving(true);
    try {
      await fetch('/api/settings/category-styles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category, style, action: 'remove' }),
      });
      onRemoved();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <span className="bg-[#f0ebe3] text-[#1a1a1a] rounded-full px-3 py-1 text-sm flex items-center gap-1">
      {style}
      <button type="button" onClick={remove} disabled={removing} className="text-[#6b6560] hover:text-red-500">
        ×
      </button>
    </span>
  );
}

function AddStyleInput({ category, onAdded }: {
  category: string;
  onAdded:  () => void;
}) {
  const [value, setValue]   = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const style = value.trim();
    if (!style || saving) return;
    setSaving(true);
    try {
      await fetch('/api/settings/category-styles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category, style, action: 'add' }),
      });
      setValue('');
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        placeholder="Add style…"
        className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158]"
      />
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="px-3 py-1.5 text-sm font-medium text-white bg-[#456158] rounded-lg hover:bg-[#3a5049] disabled:opacity-50 transition-colors"
      >
        Add
      </button>
    </div>
  );
}

function ProductStylesSection() {
  const [styles, setStyles]   = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStyles() {
    setLoading(true);
    try {
      const res  = await fetch('/api/settings/category-styles', { cache: 'no-store' });
      const data = await res.json();
      setStyles(data.styles ?? {});
    } catch {
      setStyles({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStyles(); }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">Product Styles</h2>
      <p className="text-sm text-[#6b6560] mb-4">Manage style options shown on each product page</p>

      {loading || !styles ? (
        <p className="text-sm text-[#6b6560]">Loading styles...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STYLE_CATEGORIES.map(category => (
            <div key={category}>
              <h3 className="font-semibold text-[#1a1a1a] mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {(styles[category] ?? []).map(style => (
                  <StylePill key={style} category={category} style={style} onRemoved={fetchStyles} />
                ))}
              </div>
              <AddStyleInput category={category} onAdded={fetchStyles} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f8f5f0] px-3 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">

        <h1 className="font-playfair text-3xl font-semibold text-[#1a1a1a] mb-8">Settings</h1>

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-red-700 mb-4">Danger Zone</h2>
          {DELETE_ACTIONS.map(action => (
            <DeleteRow key={action.id} action={action} />
          ))}
        </div>

        {/* ── Categories & Styles ───────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e0d4] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">Categories &amp; Styles</h2>
          <p className="text-sm text-[#6b6560] mb-4">
            To add new categories or styles, update the <code className="font-mono text-xs bg-[#f0ebe3] px-1 py-0.5 rounded">CATEGORY_MAP</code> constant in{' '}
            <code className="font-mono text-xs bg-[#f0ebe3] px-1 py-0.5 rounded">src/components/products/AddProductDrawer.tsx</code> and{' '}
            <code className="font-mono text-xs bg-[#f0ebe3] px-1 py-0.5 rounded">src/app/products/new/page.tsx</code>
          </p>

          <div className="rounded-xl border border-[#f0ebe3] overflow-hidden w-full text-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f0ebe3]">
                  <th className="px-4 py-2 text-left font-semibold text-[#6b6560]">Category</th>
                  <th className="px-4 py-2 text-left font-semibold text-[#6b6560]">Code</th>
                  <th className="px-4 py-2 text-left font-semibold text-[#6b6560]">Styles</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_REF.map((cat, i) => (
                  <tr
                    key={cat.code}
                    className={`border-t border-[#f0ebe3] ${i % 2 === 1 ? 'bg-[#faf8f5]' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3 font-medium text-[#1a1a1a] whitespace-nowrap">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-[#6b6560] whitespace-nowrap">{cat.code}</td>
                    <td className="px-4 py-3 text-[#6b6560]">
                      {(() => {
                        const styleList = cat.styles.join(', ');
                        const shortList = cat.styles.slice(0, 3).join(', ');
                        const remaining = cat.styles.length - 3;
                        return (
                          <>
                            <span className="md:hidden">
                              {shortList}{remaining > 0 ? ` +${remaining} more` : ''}
                            </span>
                            <span className="hidden md:inline">{styleList}</span>
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Product Styles ───────────────────────────────────────── */}
        <ProductStylesSection />

      </div>
    </div>
  );
}
