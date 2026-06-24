'use client';

import { useState, useEffect } from 'react';

interface GaugeEntry {
  _id: string; type: 'ROUND' | 'FANCY';
  shape: string; sizeStr: string; L: number; W: number | null;
  caratPerStone: number; avgRatePerCt: number | null;
}

function fmtCarat(v: number): string { return parseFloat(v.toFixed(4)).toString(); }
function fmtPcs(v: number):  string  { return v > 0 ? (1 / v).toFixed(2) : '—'; }
function fmtRate(v: number | null): string { return v != null ? '₹ ' + Math.round(v).toLocaleString('en-IN') : '—'; }
function fmtCost(carat: number, rate: number | null): string {
  if (rate == null || carat <= 0) return '—';
  const v = carat * rate;
  return '₹ ' + (v >= 100 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(2));
}

function PencilIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
function CheckIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}
function XIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

const th  = 'px-4 py-3 text-left text-[11px] font-semibold text-[#6b6560] uppercase tracking-wider whitespace-nowrap';
const thr = 'px-4 py-3 text-right text-[11px] font-semibold text-[#6b6560] uppercase tracking-wider whitespace-nowrap';
const td  = 'px-4 py-3 text-sm text-[#1a1a1a]';
const tdr = 'px-4 py-3 text-sm text-[#1a1a1a] text-right tabular-nums';
const editInp = 'rounded-lg border border-brand/30 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export default function GaugePage() {
  const [entries,    setEntries]    = useState<GaugeEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchErr,   setFetchErr]   = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<'Round' | 'Fancy'>('Round');
  const [shapeFilter, setShapeFilter] = useState('');
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editCarat,  setEditCarat]  = useState('');
  const [editRate,   setEditRate]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setFetchErr(null);
      try {
        const res = await fetch('/api/gauge', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load gauge data');
        const data: GaugeEntry[] = await res.json();
        if (!cancelled) setEntries(data);
      } catch (e) {
        if (!cancelled) setFetchErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function switchTab(tab: 'Round' | 'Fancy') { setActiveTab(tab); setEditId(null); setSaveErr(null); }

  function startEdit(e: GaugeEntry) {
    setEditId(e._id);
    setEditCarat(fmtCarat(e.caratPerStone));
    setEditRate(e.avgRatePerCt != null ? String(Math.round(e.avgRatePerCt)) : '');
    setSaveErr(null);
  }

  async function saveEdit() {
    if (!editId) return;
    const carat = parseFloat(editCarat);
    if (!Number.isFinite(carat) || carat <= 0) { setSaveErr('Carat must be positive'); return; }
    setSaving(true); setSaveErr(null);
    try {
      const res = await fetch(`/api/gauge/${editId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caratPerStone: carat, avgRatePerCt: editRate !== '' ? parseFloat(editRate) : null }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})) as { message?: string }; throw new Error(err.message ?? 'Save failed'); }
      const updated: GaugeEntry = await res.json();
      setEntries(prev => prev.map(e => e._id === editId ? updated : e));
      setEditId(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed');
    } finally { setSaving(false); }
  }

  const roundEntries  = entries.filter(e => e.type === 'ROUND').sort((a, b) => a.L - b.L);
  const fancyShapes   = [...new Set(entries.filter(e => e.type === 'FANCY').map(e => e.shape))].sort();
  const fancyEntries  = entries.filter(e => e.type === 'FANCY' && (!shapeFilter || e.shape === shapeFilter)).sort((a, b) => a.shape.localeCompare(b.shape) || a.L - b.L);
  const liveCarat     = parseFloat(editCarat) || 0;
  const liveRate      = editRate !== '' ? (parseFloat(editRate) || null) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fetchErr) return (
    <div className="p-8"><p className="text-red-600 text-sm">{fetchErr}</p></div>
  );

  const displayRows = activeTab === 'Round' ? roundEntries : fancyEntries;

  return (
    <div className="p-8 space-y-5 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Diamond Gauge</h1>
        <p className="text-sm text-[#6b6560] mt-0.5">{entries.length} size references</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {(['Round', 'Fancy'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab ? 'bg-brand text-white shadow-sm' : 'text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#f0ebe3]'
            }`}
          >
            {tab}{' '}
            <span className={`text-xs ${activeTab === tab ? 'text-white/70' : 'text-[#6b6560]/60'}`}>
              ({tab === 'Round' ? roundEntries.length : entries.filter(e => e.type === 'FANCY').length})
            </span>
          </button>
        ))}
      </div>

      {/* Fancy shape filter */}
      {activeTab === 'Fancy' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Shape</label>
          <select
            className="rounded-lg border border-[#ddd5c8] px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-[#1a1a1a]"
            value={shapeFilter}
            onChange={ev => { setShapeFilter(ev.target.value); setEditId(null); setSaveErr(null); }}
          >
            <option value="">All shapes</option>
            {fancyShapes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {shapeFilter && <span className="text-xs text-[#6b6560]">{fancyEntries.length} entries</span>}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
              <tr>
                {activeTab === 'Fancy' && <th className={th}>Shape</th>}
                <th className={th}>{activeTab === 'Round' ? 'Size (mm)' : 'Size'}</th>
                <th className={thr}>Carat/Stone</th>
                <th className={thr}>Pcs/ct</th>
                <th className={thr}>Avg ₹/ct</th>
                <th className={thr}>₹/Stone</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {displayRows.map(e => {
                const isEditing = editId === e._id;
                return (
                  <tr key={e._id} className={`border-b border-[#f0ebe3] transition-colors ${isEditing ? 'bg-brand/[0.03]' : 'hover:bg-[#f8f5f0]/60'}`}>
                    {activeTab === 'Fancy' && <td className={td}>{e.shape}</td>}
                    <td className={`${td} font-mono text-[#1a1a1a] font-medium`}>{e.sizeStr}</td>

                    {isEditing ? (
                      <>
                        <td className="px-3 py-2.5">
                          <input type="number" min="0" step="0.0001" className={editInp} style={{ width: '100px' }}
                            value={editCarat} onChange={ev => setEditCarat(ev.target.value)} autoFocus />
                        </td>
                        <td className={tdr}>{liveCarat > 0 ? fmtPcs(liveCarat) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <input type="number" min="0" step="1" className={editInp} style={{ width: '110px' }}
                            value={editRate} onChange={ev => setEditRate(ev.target.value)} placeholder="—" />
                        </td>
                        <td className={tdr}>{liveCarat > 0 ? fmtCost(liveCarat, liveRate) : '—'}</td>
                      </>
                    ) : (
                      <>
                        <td className={tdr}>{fmtCarat(e.caratPerStone)}</td>
                        <td className={tdr}>{fmtPcs(e.caratPerStone)}</td>
                        <td className={tdr}>{fmtRate(e.avgRatePerCt)}</td>
                        <td className={`${tdr} font-medium text-brand`}>{fmtCost(e.caratPerStone, e.avgRatePerCt)}</td>
                      </>
                    )}

                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {isEditing ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={saveEdit} disabled={saving}
                              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 transition-colors">
                              {saving ? <Spinner /> : <CheckIcon />}
                            </button>
                            <button onClick={() => { setEditId(null); setSaveErr(null); }}
                              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] transition-colors">
                              <XIcon />
                            </button>
                          </div>
                          {saveErr && <p className="text-[11px] text-red-500 mt-1 leading-tight">{saveErr}</p>}
                        </div>
                      ) : (
                        <button onClick={() => startEdit(e)}
                          className="p-1.5 rounded-lg text-[#6b6560]/40 hover:text-brand hover:bg-brand/5 transition-colors" title="Edit">
                          <PencilIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'Fancy' ? 7 : 6} className="px-4 py-10 text-center text-sm text-[#6b6560]">
                    No entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
