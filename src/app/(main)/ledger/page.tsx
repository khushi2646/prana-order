'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: number;
  date: string;
  type: 'IN' | 'OUT' | 'CORRECTION';
  shape: string;
  size: string;
  colour: string;
  pieces: number;
  carats: number;
  ref?: string;
  notes?: string;
}

type ActiveTab = 'dashboard' | 'entry' | 'ledger' | 'stock' | 'settings';

interface StockGroup {
  shape:  string;
  size:   string;
  colour: string;
  inPcs:  number;
  outPcs: number;
  inCt:   number;
  outCt:  number;
  netPcs: number;
  netCt:  number;
}

interface EntryForm {
  date:     string;
  type:     'IN' | 'OUT';
  shape:    string;
  lengthMM: string;
  widthMM:  string;
  pieces:   string;
  carats:   string;
  colour:   string;
  ref:      string;
  notes:    string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { value: ActiveTab; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'entry',     label: 'New Entry' },
  { value: 'ledger',    label: 'Ledger' },
  { value: 'stock',     label: 'Current Stock' },
  { value: 'settings',  label: 'Settings' },
];

const TYPE_BADGE: Record<LedgerEntry['type'], string> = {
  IN:         'bg-[#e8efed] text-[#456158]',
  OUT:        'bg-red-50 text-red-600',
  CORRECTION: 'bg-amber-50 text-amber-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const day   = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  return `${day} ${month} ${date.getFullYear()}`;
}

function fmtColour(colour: string): string {
  return colour.toUpperCase() === 'WHITE' ? '—' : colour;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntryForm(date: string, type: 'IN' | 'OUT'): EntryForm {
  return { date, type, shape: '', lengthMM: '', widthMM: '', pieces: '', carats: '', colour: 'WHITE', ref: '', notes: '' };
}

// Builds the stored size string. ROUND uses length only; other shapes use
// "LxW" with the larger dimension first (same convention as the original app).
function buildSizeStr(shape: string, lengthMM: string, widthMM: string): string {
  const l = parseFloat(lengthMM);
  if (shape.toUpperCase() === 'ROUND' || !widthMM) {
    return Number.isFinite(l) ? l.toFixed(2) : lengthMM;
  }
  const w = parseFloat(widthMM);
  if (!Number.isFinite(l) || !Number.isFinite(w)) return lengthMM;
  const big   = Math.max(l, w);
  const small = Math.min(l, w);
  return `${big.toFixed(2)}x${small.toFixed(2)}`;
}

const lbl = 'text-xs font-semibold text-[#6b6560] uppercase tracking-wide';
const inp = 'w-full border border-[#ddd5c8] rounded-lg px-3 py-2 text-sm bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors';
const SelectWrapper = ({ children }: { children: ReactNode }) => (
  <div className="relative">
    {children}
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg className="w-3.5 h-3.5 text-[#6b6560]" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, subtitle, positive }: {
  label:    string;
  value:    string;
  subtitle?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white border border-[#f0ebe3] rounded-lg p-4 shadow-sm">
      <p className="text-xs font-semibold text-[#6b6560] uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono ${positive ? 'text-[#456158]' : 'text-[#1a1a1a]'}`}>{value}</p>
      {subtitle && <p className="text-xs text-[#6b6560] mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Delete entry button ───────────────────────────────────────────────────────

function DeleteEntryButton({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await fetch('/api/ledger/delete', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      });
      onDeleted();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 text-xs font-bold transition-colors mx-auto">
        ×
      </button>
    );
  }

  return (
    <span className="flex items-center justify-center gap-1.5 text-xs whitespace-nowrap">
      Delete?
      <button type="button" onClick={confirmDelete} disabled={deleting}
        className="text-red-600 font-semibold hover:underline disabled:opacity-50">Yes</button>
      <button type="button" onClick={() => setConfirming(false)}
        className="text-[#6b6560] hover:underline">No</button>
    </span>
  );
}

// ── Stock card ────────────────────────────────────────────────────────────────

function StockCard({ group, onCorrect }: { group: StockGroup; onCorrect: () => void }) {
  const positive = group.netPcs > 0;
  return (
    <div className="relative bg-white border border-[#f0ebe3] rounded-lg p-4 shadow-sm">
      <button type="button" onClick={onCorrect}
        className="absolute top-2 right-2 text-xs font-semibold text-[#456158] border border-[#456158]/30 rounded-full px-2 py-0.5 hover:bg-[#456158]/5 transition-colors">
        Correct
      </button>
      <p className="text-sm font-bold text-[#1a1a1a] pr-16">
        {group.shape} {group.size}
        {group.colour && group.colour.toUpperCase() !== 'WHITE' ? ` · ${group.colour}` : ''}
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-[#6b6560]">
        <div className="flex justify-between"><span>IN pcs</span><span>{group.inPcs}</span></div>
        <div className="flex justify-between"><span>OUT pcs</span><span>{group.outPcs}</span></div>
        <div className="flex justify-between"><span>IN ct</span><span>{group.inCt.toFixed(3)}</span></div>
        <div className="flex justify-between"><span>OUT ct</span><span>{group.outCt.toFixed(3)}</span></div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#f0ebe3]">
        <p className="text-[10px] font-semibold text-[#6b6560] uppercase tracking-wide">Net on hand</p>
        <p className={`text-2xl font-bold font-mono ${positive ? 'text-[#456158]' : 'text-red-600'}`}>{group.netPcs}</p>
        <p className={`text-xs font-semibold ${positive ? 'text-[#456158]' : 'text-red-600'}`}>{group.netCt.toFixed(3)} ct</p>
      </div>
    </div>
  );
}

// ── Manage list section (shapes / colours / sizes) ────────────────────────────

function ManageListSection({ title, subtitle, field, values, excludeValue, displayFn, onChanged }: {
  title:       string;
  subtitle:    string;
  field:       'shapes' | 'colours' | 'sizes';
  values:      string[];
  excludeValue?: string;
  displayFn?:  (v: string) => string;
  onChanged:   () => void;
}) {
  const [value, setValue]   = useState('');
  const [saving, setSaving] = useState(false);

  async function post(action: 'add' | 'remove', val: string) {
    setSaving(true);
    try {
      await fetch('/api/ledger/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field, action, value: val }),
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const v = value.trim().toUpperCase();
    if (!v || saving) return;
    await post('add', v);
    setValue('');
  }

  const visible = values.filter(v => v !== excludeValue);

  return (
    <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
      <h2 className="text-sm font-bold text-[#1a1a1a] mb-1">{title}</h2>
      <p className="text-xs text-[#6b6560] mb-4">{subtitle}</p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className={inp}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="Add new…"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#456158] rounded-lg hover:bg-[#3a5049] disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          + Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map(v => (
          <span key={v} className="bg-[#f0ebe3] text-[#1a1a1a] border border-[#ddd5c8] rounded-full px-3 py-1 text-sm flex items-center gap-2">
            {displayFn ? displayFn(v) : v}
            <button type="button" onClick={() => post('remove', v)} disabled={saving} className="text-[#6b6560] hover:text-red-500 disabled:opacity-50">
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Delete all data button ────────────────────────────────────────────────────

function DeleteAllDataButton({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [value, setValue]           = useState('');
  const [deleting, setDeleting]     = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState<string | null>(null);

  function cancel() {
    setConfirming(false);
    setValue('');
    setError(null);
  }

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/ledger/all', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'Failed to delete data');
      }
      onDeleted();
      setConfirming(false);
      setValue('');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete data');
    } finally {
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <div>
        <button type="button" onClick={() => { setConfirming(true); setDone(false); }}
          className="border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50 transition-colors">
          Delete all data
        </button>
        {done && <p className="text-sm text-green-600 mt-2 font-medium">All data deleted</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <span className="text-xs text-red-600">Type &quot;DELETE&quot; to confirm</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          placeholder="DELETE"
          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
        />
        <button type="button" onClick={cancel} disabled={deleting}
          className="text-sm text-[#6b6560] border border-[#ddd5c8] rounded-lg px-3 py-1.5 hover:bg-[#f8f5f0] disabled:opacity-50 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={confirmDelete} disabled={value !== 'DELETE' || deleting}
          className="text-sm text-white bg-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {deleting ? 'Deleting…' : 'Confirm'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Correction modal ─────────────────────────────────────────────────────────

function CorrectionModal({ group, onClose, onSaved }: {
  group:   StockGroup;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [actualPieces, setActualPieces] = useState(String(group.netPcs));
  const [actualCarats, setActualCarats] = useState(group.netCt.toFixed(3));
  const [notes, setNotes]               = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  async function submit() {
    setError(null);
    const pieces = parseInt(actualPieces, 10);
    const carats = parseFloat(actualCarats);
    if (!Number.isFinite(pieces) || !Number.isFinite(carats)) {
      setError('Please enter valid numbers for pieces and carats.');
      return;
    }

    const diffPieces = pieces - group.netPcs;
    const diffCarats = carats - group.netCt;

    if (diffPieces === 0 && diffCarats === 0) {
      setError('No difference from current stock — nothing to correct.');
      return;
    }

    const entry: LedgerEntry = {
      id:     Date.now(),
      date:   todayStr(),
      type:   'CORRECTION',
      shape:  group.shape,
      size:   group.size,
      colour: group.colour || 'WHITE',
      pieces: diffPieces,
      carats: diffCarats,
      notes:  notes.trim() || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/ledger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entry }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'Failed to save correction');
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save correction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl p-4 w-[420px] max-h-[80vh] overflow-y-auto z-50">
        <h2 className="text-sm font-bold text-[#1a1a1a] mb-1">Correct stock — {group.shape} {group.size}</h2>
        <p className="text-xs text-[#6b6560] mb-4">
          Current: {group.netPcs} pcs · {group.netCt.toFixed(3)} ct
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={lbl}>Actual pieces</label>
            <input type="number" className={inp} value={actualPieces} onChange={e => setActualPieces(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Actual carats</label>
            <input type="number" step="0.001" className={inp} value={actualCarats} onChange={e => setActualCarats(e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className={lbl}>Notes</label>
          <input type="text" className={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for correction…" />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={submit} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#456158] rounded-lg hover:bg-[#3a5049] disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Correction'}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-[#6b6560] border border-[#ddd5c8] rounded-lg hover:bg-[#f8f5f0] disabled:opacity-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [entries, setEntries]     = useState<LedgerEntry[]>([]);
  const [sizes, setSizes]         = useState<string[]>([]);
  const [shapes, setShapes]       = useState<string[]>([]);
  const [colours, setColours]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerRes, settingsRes] = await Promise.all([
        fetch('/api/ledger', { cache: 'no-store' }),
        fetch('/api/ledger/settings', { cache: 'no-store' }),
      ]);
      const ledgerData   = await ledgerRes.json();
      const settingsData = await settingsRes.json();

      setEntries(Array.isArray(ledgerData.entries) ? ledgerData.entries : []);
      setShapes(Array.from(new Set([...(ledgerData.shapes ?? []), ...(settingsData.shapes ?? [])])));
      setColours(Array.from(new Set([...(ledgerData.colours ?? []), ...(settingsData.colours ?? [])])));
      setSizes(Array.from(new Set([...(ledgerData.sizes ?? []), ...(settingsData.sizes ?? [])])));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const stats = useMemo(() => {
    let inPcs = 0, inCt = 0, outPcs = 0, outCt = 0;
    let lastDate: string | null = null;

    for (const e of entries) {
      const pieces = e.pieces || 0;
      const carats = e.carats || 0;

      if (e.type === 'IN') {
        inPcs += pieces; inCt += carats;
      } else if (e.type === 'OUT') {
        outPcs += pieces; outCt += carats;
      } else if (e.type === 'CORRECTION') {
        if (pieces >= 0) inPcs += pieces; else outPcs += Math.abs(pieces);
        if (carats >= 0) inCt  += carats; else outCt  += Math.abs(carats);
      }

      if (!lastDate || e.date > lastDate) lastDate = e.date;
    }

    return {
      netPcs: inPcs - outPcs,
      netCt:  inCt - outCt,
      inPcs, inCt, outPcs, outCt,
      totalEntries: entries.length,
      lastDate,
    };
  }, [entries]);

  const recent = useMemo(() => {
    return [...entries]
      .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.id - a.id))
      .slice(0, 10);
  }, [entries]);

  const th  = 'px-2.5 py-2.5 text-left text-[11px] font-semibold text-[#6b6560] uppercase tracking-wider whitespace-nowrap';
  const tdR = 'px-2.5 py-3 text-sm text-[#1a1a1a] whitespace-nowrap';

  // ── New Entry tab ─────────────────────────────────────────────────────────

  const [entryForm, setEntryForm]   = useState<EntryForm>(() => emptyEntryForm(todayStr(), 'IN'));
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [stockPreview, setStockPreview] = useState<{ sizeStr: string; pcs: number } | null>(null);

  const isRoundShape = entryForm.shape.trim().toUpperCase() === 'ROUND';

  const todaysEntries = useMemo(() => {
    const today = todayStr();
    return entries.filter(e => e.date === today).sort((a, b) => b.id - a.id);
  }, [entries]);

  // Debounced stock preview whenever shape/size/colour changes
  useEffect(() => {
    const shape = entryForm.shape.trim();
    if (!shape || !entryForm.lengthMM || (!isRoundShape && !entryForm.widthMM)) {
      setStockPreview(null);
      return;
    }
    const sizeStr = buildSizeStr(shape, entryForm.lengthMM, entryForm.widthMM);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/ledger/stock', { cache: 'no-store' });
        const data: StockGroup[] = await res.json();
        const match = Array.isArray(data)
          ? data.find(g =>
              g.shape === shape.toUpperCase() &&
              g.size === sizeStr.toUpperCase() &&
              g.colour === (entryForm.colour || 'WHITE').toUpperCase()
            )
          : undefined;
        setStockPreview({ sizeStr, pcs: match?.netPcs ?? 0 });
      } catch {
        setStockPreview({ sizeStr, pcs: 0 });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [entryForm.shape, entryForm.lengthMM, entryForm.widthMM, entryForm.colour, isRoundShape]);

  function onShapeChange(value: string) {
    setEntryForm(p => ({ ...p, shape: value, lengthMM: '', widthMM: '' }));
  }

  function handleClearEntry() {
    setEntryForm(emptyEntryForm(todayStr(), 'IN'));
    setEntryError(null);
  }

  async function handleSubmitEntry() {
    setEntryError(null);
    const shape = entryForm.shape.trim();

    if (
      !entryForm.date || !entryForm.type || !shape || !entryForm.lengthMM ||
      (!isRoundShape && !entryForm.widthMM) || !entryForm.pieces || !entryForm.carats
    ) {
      setEntryError('Please fill in all required fields.');
      return;
    }

    const pieces = parseInt(entryForm.pieces, 10);
    const carats = parseFloat(entryForm.carats);
    if (!Number.isFinite(pieces) || pieces < 1) { setEntryError('No. of Pieces must be at least 1.'); return; }
    if (!Number.isFinite(carats)) { setEntryError('Carat Weight is required.'); return; }

    const entry: LedgerEntry = {
      id:     Date.now(),
      date:   entryForm.date,
      type:   entryForm.type,
      shape:  shape.toUpperCase(),
      size:   buildSizeStr(shape, entryForm.lengthMM, entryForm.widthMM).toUpperCase(),
      colour: (entryForm.colour || 'WHITE').toUpperCase(),
      pieces,
      carats,
      ref:    entryForm.ref.trim() || undefined,
      notes:  entryForm.notes.trim() || undefined,
    };

    setEntrySaving(true);
    try {
      const res = await fetch('/api/ledger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entry }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? 'Failed to save entry');
      }
      await fetchAll();
      setEntryForm(prev => emptyEntryForm(prev.date, prev.type));
    } catch (e) {
      setEntryError(e instanceof Error ? e.message : 'Failed to save entry');
    } finally {
      setEntrySaving(false);
    }
  }

  // ── Ledger tab ────────────────────────────────────────────────────────────

  const [ledgerSearch, setLedgerSearch]           = useState('');
  const [ledgerShapeFilter, setLedgerShapeFilter] = useState('');
  const [ledgerSizeFilter, setLedgerSizeFilter]   = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter]   = useState<'' | LedgerEntry['type']>('');
  const [ledgerFromDate, setLedgerFromDate]       = useState('');
  const [ledgerToDate, setLedgerToDate]           = useState('');

  const uniqueSizes = useMemo(
    () => Array.from(new Set(entries.map(e => e.size))).sort(),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return entries
      .filter(e => {
        if (ledgerShapeFilter && e.shape !== ledgerShapeFilter) return false;
        if (ledgerSizeFilter && e.size !== ledgerSizeFilter) return false;
        if (ledgerTypeFilter && e.type !== ledgerTypeFilter) return false;
        if (ledgerFromDate && e.date < ledgerFromDate) return false;
        if (ledgerToDate && e.date > ledgerToDate) return false;
        if (q) {
          const haystack = `${e.shape} ${e.size} ${e.colour} ${e.ref ?? ''} ${e.notes ?? ''} ${e.date}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.id - a.id));
  }, [entries, ledgerSearch, ledgerShapeFilter, ledgerSizeFilter, ledgerTypeFilter, ledgerFromDate, ledgerToDate]);

  const ledgerTotals = useMemo(() => {
    let inPcs = 0, inCt = 0, outPcs = 0, outCt = 0;
    for (const e of filteredEntries) {
      const pieces = e.pieces || 0;
      const carats = e.carats || 0;
      if (e.type === 'IN') { inPcs += pieces; inCt += carats; }
      else if (e.type === 'OUT') { outPcs += pieces; outCt += carats; }
      else if (e.type === 'CORRECTION') {
        if (pieces >= 0) inPcs += pieces; else outPcs += Math.abs(pieces);
        if (carats >= 0) inCt  += carats; else outCt  += Math.abs(carats);
      }
    }
    return { inPcs, outPcs, inCt, outCt, netPcs: inPcs - outPcs, netCt: inCt - outCt };
  }, [filteredEntries]);

  function clearLedgerFilters() {
    setLedgerSearch('');
    setLedgerShapeFilter('');
    setLedgerSizeFilter('');
    setLedgerTypeFilter('');
    setLedgerFromDate('');
    setLedgerToDate('');
  }

  function downloadCsv(filename: string, rows: LedgerEntry[]) {
    const header = ['Date', 'Type', 'Shape', 'Size', 'Colour', 'Pieces', 'Carats', 'Ref', 'Notes'];
    const body = rows.map(e => [e.date, e.type, e.shape, e.size, e.colour, String(e.pieces), String(e.carats), e.ref ?? '', e.notes ?? '']);
    const csv = [header, ...body]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Current Stock tab ────────────────────────────────────────────────────

  const [stockGroups, setStockGroups]       = useState<StockGroup[]>([]);
  const [stockLoading, setStockLoading]     = useState(false);
  const [stockSearch, setStockSearch]       = useState('');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<StockGroup | null>(null);

  const fetchStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const res = await fetch('/api/ledger/stock', { cache: 'no-store' });
      const data = await res.json();
      setStockGroups(Array.isArray(data) ? data : []);
    } catch {
      setStockGroups([]);
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'stock') fetchStock();
  }, [activeTab, fetchStock]);

  const filteredStock = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return stockGroups;
    return stockGroups.filter(g => g.shape.toLowerCase().includes(q) || g.size.toLowerCase().includes(q));
  }, [stockGroups, stockSearch]);

  const sortStock = (a: StockGroup, b: StockGroup) =>
    a.shape === b.shape ? a.size.localeCompare(b.size) : a.shape.localeCompare(b.shape);

  const inStock    = useMemo(() => filteredStock.filter(g => g.netPcs > 0).sort(sortStock), [filteredStock]);
  const outOfStock = useMemo(() => filteredStock.filter(g => g.netPcs <= 0).sort(sortStock), [filteredStock]);

  const stockTotals = useMemo(() => filteredStock.reduce((acc, g) => ({
    inPcs:  acc.inPcs  + g.inPcs,
    outPcs: acc.outPcs + g.outPcs,
    netPcs: acc.netPcs + g.netPcs,
    inCt:   acc.inCt   + g.inCt,
    outCt:  acc.outCt  + g.outCt,
    netCt:  acc.netCt  + g.netCt,
  }), { inPcs: 0, outPcs: 0, netPcs: 0, inCt: 0, outCt: 0, netCt: 0 }), [filteredStock]);

  return (
    <div className="min-h-screen bg-[#f8f5f0] px-3 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="font-playfair text-2xl sm:text-3xl font-semibold text-[#1a1a1a]">Diamond Ledger</h1>
            <p className="text-sm text-[#6b6560] mt-1">Stock &amp; Transaction Tracker</p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#456158]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Live
              </span>
            )}
            <button
              type="button"
              onClick={fetchAll}
              className="text-sm border border-[#ddd5c8] rounded-lg px-3 py-1.5 text-[#6b6560] hover:bg-[#f8f5f0] transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-4 border-b border-[#e8e0d4] mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`pb-2.5 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? 'text-[#456158] border-b-2 border-[#456158] font-semibold'
                  : 'text-[#6b6560] hover:text-[#1a1a1a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        {loading ? (
          <p className="text-center text-[#6b6560] mt-16">Loading…</p>
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Net Stock (pcs)" value={String(stats.netPcs)} positive={stats.netPcs > 0} />
              <StatCard label="Net Stock (ct)" value={stats.netCt.toFixed(3)} positive={stats.netCt > 0} />
              <StatCard label="Total IN (pcs)" value={String(stats.inPcs)} subtitle={`${stats.inCt.toFixed(3)} ct`} />
              <StatCard label="Total OUT (pcs)" value={String(stats.outPcs)} subtitle={`${stats.outCt.toFixed(3)} ct`} />
              <StatCard label="Total Entries" value={String(stats.totalEntries)} subtitle={stats.lastDate ? `Last: ${fmtDate(stats.lastDate)}` : 'No entries yet'} />
            </div>

            {/* Recent transactions */}
            <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
              <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Recent transactions</h2>
              {recent.length === 0 ? (
                <p className="text-sm text-[#6b6560]">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#e8e0d4]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                        <th className={th}>Date</th>
                        <th className={th}>Type</th>
                        <th className={th}>Shape</th>
                        <th className={th}>Size</th>
                        <th className={th}>Colour</th>
                        <th className={`${th} text-right`}>Pieces</th>
                        <th className={`${th} text-right`}>Carats</th>
                        <th className={th}>Ref</th>
                        <th className={th}>Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ebe3]">
                      {recent.map(e => (
                        <tr key={e.id} className="hover:bg-[#f8f5f0]/60">
                          <td className={tdR}>{fmtDate(e.date)}</td>
                          <td className={tdR}>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[e.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {e.type}
                            </span>
                          </td>
                          <td className={`${tdR} font-mono`}>{e.shape}</td>
                          <td className={`${tdR} font-mono`}>{e.size}</td>
                          <td className={tdR}>{fmtColour(e.colour)}</td>
                          <td className={`${tdR} text-right`}>{e.pieces}</td>
                          <td className={`${tdR} text-right`}>{e.carats}</td>
                          <td className={tdR}>{e.ref || '—'}</td>
                          <td className={tdR}>{e.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'entry' ? (
          <div className="space-y-6">
            {/* Add new entry */}
            <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
              <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Add new entry</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className={lbl}>Date <span className="text-red-500">*</span></label>
                  <input type="date" className={inp} value={entryForm.date}
                    onChange={e => setEntryForm(p => ({ ...p, date: e.target.value }))} />
                </div>

                <div>
                  <label className={lbl}>Type <span className="text-red-500">*</span></label>
                  <SelectWrapper>
                    <select className={inp} value={entryForm.type}
                      onChange={e => setEntryForm(p => ({ ...p, type: e.target.value as 'IN' | 'OUT' }))}>
                      <option value="IN">IN (Received)</option>
                      <option value="OUT">OUT (Dispatched)</option>
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={lbl}>Shape <span className="text-red-500">*</span></label>
                  <input type="text" list="ledger-shapes-datalist" className={inp} placeholder="Type to search..."
                    value={entryForm.shape} onChange={e => onShapeChange(e.target.value.toUpperCase())} />
                  <datalist id="ledger-shapes-datalist">
                    {shapes.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div>
                  <label className={lbl}>Length MM <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" className={inp} placeholder="0.00" value={entryForm.lengthMM}
                    onChange={e => setEntryForm(p => ({ ...p, lengthMM: e.target.value }))} />
                </div>

                {!isRoundShape && (
                  <div>
                    <label className={lbl}>Width MM <span className="text-red-500">*</span></label>
                    <input type="number" step="0.01" className={inp} placeholder="0.00" value={entryForm.widthMM}
                      onChange={e => setEntryForm(p => ({ ...p, widthMM: e.target.value }))} />
                  </div>
                )}

                <div>
                  <label className={lbl}>No. of Pieces <span className="text-red-500">*</span></label>
                  <input type="number" min={1} className={inp} placeholder="0" value={entryForm.pieces}
                    onChange={e => setEntryForm(p => ({ ...p, pieces: e.target.value }))} />
                </div>

                <div>
                  <label className={lbl}>Carat Weight <span className="text-red-500">*</span></label>
                  <input type="number" step="0.001" className={inp} placeholder="0.000" value={entryForm.carats}
                    onChange={e => setEntryForm(p => ({ ...p, carats: e.target.value }))} />
                </div>

                <div>
                  <label className={lbl}>Colour</label>
                  <SelectWrapper>
                    <select className={inp} value={entryForm.colour}
                      onChange={e => setEntryForm(p => ({ ...p, colour: e.target.value }))}>
                      {colours.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={lbl}>Invoice/Ref No.</label>
                  <input type="text" className={inp} placeholder="Optional" value={entryForm.ref}
                    onChange={e => setEntryForm(p => ({ ...p, ref: e.target.value }))} />
                </div>

                <div className="col-span-2">
                  <label className={lbl}>Notes</label>
                  <input type="text" className={inp} placeholder="Optional remarks" value={entryForm.notes}
                    onChange={e => setEntryForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>

              {/* Size preview strip */}
              {stockPreview && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-semibold ${stockPreview.pcs > 0 ? 'text-[#456158]' : 'text-red-600'}`}>
                    Stock for {entryForm.shape.toUpperCase()} {stockPreview.sizeStr}: {stockPreview.pcs} pcs
                  </span>
                  {entryForm.type === 'OUT' && entryForm.pieces && Number(entryForm.pieces) > stockPreview.pcs && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                      Only {stockPreview.pcs} pcs in stock. This entry will create a deficit.
                    </span>
                  )}
                </div>
              )}

              {entryError && <p className="text-sm text-red-600 mt-3">{entryError}</p>}

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={handleSubmitEntry} disabled={entrySaving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#456158] rounded-lg hover:bg-[#3a5049] disabled:opacity-60 transition-colors">
                  {entrySaving ? 'Saving…' : 'Save Entry'}
                </button>
                <button type="button" onClick={handleClearEntry}
                  className="px-4 py-2 text-sm font-semibold text-[#6b6560] border border-[#ddd5c8] rounded-lg hover:bg-[#f8f5f0] transition-colors">
                  Clear
                </button>
              </div>
            </div>

            {/* Today's entries */}
            <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
              <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Today&apos;s entries</h2>
              {todaysEntries.length === 0 ? (
                <p className="text-sm text-[#6b6560]">No entries today yet</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#e8e0d4]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                        <th className={th}>Type</th>
                        <th className={th}>Shape</th>
                        <th className={th}>Size</th>
                        <th className={th}>Colour</th>
                        <th className={`${th} text-right`}>Pieces</th>
                        <th className={`${th} text-right`}>Carats</th>
                        <th className={th}>Ref</th>
                        <th className={th}>Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ebe3]">
                      {todaysEntries.map(e => (
                        <tr key={e.id} className="hover:bg-[#f8f5f0]/60">
                          <td className={tdR}>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[e.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {e.type}
                            </span>
                          </td>
                          <td className={`${tdR} font-mono`}>{e.shape}</td>
                          <td className={`${tdR} font-mono`}>{e.size}</td>
                          <td className={tdR}>{fmtColour(e.colour)}</td>
                          <td className={`${tdR} text-right`}>{e.pieces}</td>
                          <td className={`${tdR} text-right`}>{e.carats}</td>
                          <td className={tdR}>{e.ref || '—'}</td>
                          <td className={tdR}>{e.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'ledger' ? (
          <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-bold text-[#1a1a1a]">Ledger</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => downloadCsv('diamond-ledger-full.csv', entries)}
                  className="text-sm border border-[#ddd5c8] rounded-lg px-3 py-1.5 text-[#6b6560] hover:bg-[#f8f5f0] transition-colors">
                  CSV (full)
                </button>
                <button type="button" onClick={() => downloadCsv('diamond-ledger-filtered.csv', filteredEntries)}
                  className="text-sm border border-[#ddd5c8] rounded-lg px-3 py-1.5 text-[#6b6560] hover:bg-[#f8f5f0] transition-colors">
                  CSV (filtered)
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-end gap-3 mb-4 bg-[#f8f5f0] border border-[#f0ebe3] rounded-lg p-3">
              <div className="flex-1 min-w-[160px]">
                <label className={lbl}>Search</label>
                <input type="text" className={inp} placeholder="Shape, size, colour, ref, notes, date…"
                  value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Shape</label>
                <SelectWrapper>
                  <select className={inp} value={ledgerShapeFilter} onChange={e => setLedgerShapeFilter(e.target.value)}>
                    <option value="">All shapes</option>
                    {shapes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <label className={lbl}>Size</label>
                <SelectWrapper>
                  <select className={inp} value={ledgerSizeFilter} onChange={e => setLedgerSizeFilter(e.target.value)}>
                    <option value="">All sizes</option>
                    {uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </SelectWrapper>
              </div>
              <div>
                <label className={lbl}>Type</label>
                <SelectWrapper>
                  <select className={inp} value={ledgerTypeFilter}
                    onChange={e => setLedgerTypeFilter(e.target.value as '' | LedgerEntry['type'])}>
                    <option value="">All types</option>
                    <option value="IN">IN only</option>
                    <option value="OUT">OUT only</option>
                    <option value="CORRECTION">CORRECTION only</option>
                  </select>
                </SelectWrapper>
              </div>
              <div className="flex items-end gap-1.5">
                <div>
                  <label className={lbl}>From</label>
                  <input type="date" className={inp} value={ledgerFromDate} onChange={e => setLedgerFromDate(e.target.value)} />
                </div>
                <span className="text-sm text-[#6b6560] pb-2">to</span>
                <div>
                  <label className={lbl}>To</label>
                  <input type="date" className={inp} value={ledgerToDate} onChange={e => setLedgerToDate(e.target.value)} />
                </div>
              </div>
              <button type="button" onClick={clearLedgerFilters}
                className="text-sm border border-[#ddd5c8] rounded-lg px-3 py-2 text-[#6b6560] hover:bg-white transition-colors">
                Clear
              </button>
            </div>

            {/* Transaction table */}
            {filteredEntries.length === 0 ? (
              <p className="text-sm text-[#6b6560]">No entries match these filters.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#e8e0d4]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                      <th className={`${th} text-right`}>#</th>
                      <th className={th}>Date</th>
                      <th className={th}>Type</th>
                      <th className={th}>Shape</th>
                      <th className={th}>Size</th>
                      <th className={th}>Colour</th>
                      <th className={`${th} text-right`}>Pieces</th>
                      <th className={`${th} text-right`}>Carats</th>
                      <th className={th}>Ref</th>
                      <th className={th}>Notes</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ebe3]">
                    {filteredEntries.map((e, i) => (
                      <tr key={e.id} className="hover:bg-[#f8f5f0]/60">
                        <td className={`${tdR} text-right text-[#6b6560]`}>{filteredEntries.length - i}</td>
                        <td className={tdR}>{fmtDate(e.date)}</td>
                        <td className={tdR}>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[e.type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {e.type}
                          </span>
                        </td>
                        <td className={`${tdR} font-mono`}>{e.shape}</td>
                        <td className={`${tdR} font-mono`}>{e.size}</td>
                        <td className={tdR}>{fmtColour(e.colour)}</td>
                        <td className={`${tdR} text-right`}>{e.pieces}</td>
                        <td className={`${tdR} text-right`}>{e.carats}</td>
                        <td className={tdR}>{e.ref || '—'}</td>
                        <td className={tdR}>{e.notes || '—'}</td>
                        <td className={`${tdR} text-center`}>
                          <DeleteEntryButton id={e.id} onDeleted={fetchAll} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f8f5f0] border-t border-[#e0d8ce] font-semibold">
                      <td className={tdR} colSpan={6}>Totals</td>
                      <td className={`${tdR} text-right`}>IN {ledgerTotals.inPcs} / OUT {ledgerTotals.outPcs}</td>
                      <td className={`${tdR} text-right`}>IN {ledgerTotals.inCt.toFixed(3)} / OUT {ledgerTotals.outCt.toFixed(3)}</td>
                      <td className={tdR} colSpan={3}>Net {ledgerTotals.netPcs} pcs · {ledgerTotals.netCt.toFixed(3)} ct</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'stock' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-bold text-[#1a1a1a]">Current Stock</h2>
                <input type="text" className={`${inp} max-w-xs`} placeholder="Search by shape or size…"
                  value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
              </div>

              {stockLoading ? (
                <p className="text-sm text-[#6b6560]">Loading stock…</p>
              ) : filteredStock.length === 0 ? (
                <p className="text-sm text-[#6b6560]">No stock data yet.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {inStock.map(g => (
                      <StockCard key={`${g.shape}|${g.size}|${g.colour}`} group={g} onCorrect={() => setCorrectionTarget(g)} />
                    ))}
                  </div>

                  {outOfStock.length > 0 && (
                    <div className="mt-4">
                      <button type="button" onClick={() => setShowOutOfStock(s => !s)}
                        className="text-sm text-[#456158] font-semibold hover:underline">
                        {showOutOfStock ? 'Hide out of stock' : `Show out of stock (${outOfStock.length})`}
                      </button>
                      {showOutOfStock && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
                          {outOfStock.map(g => (
                            <StockCard key={`${g.shape}|${g.size}|${g.colour}`} group={g} onCorrect={() => setCorrectionTarget(g)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Stock table */}
            <div className="bg-white rounded-lg border border-[#e8e0d4] shadow-sm p-4">
              <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Stock table</h2>
              {filteredStock.length === 0 ? (
                <p className="text-sm text-[#6b6560]">No stock data yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#e8e0d4]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                        <th className={th}>Shape</th>
                        <th className={th}>Size</th>
                        <th className={th}>Colour</th>
                        <th className={`${th} text-right`}>IN (pcs)</th>
                        <th className={`${th} text-right`}>OUT (pcs)</th>
                        <th className={`${th} text-right`}>Net (pcs)</th>
                        <th className={`${th} text-right`}>IN (ct)</th>
                        <th className={`${th} text-right`}>OUT (ct)</th>
                        <th className={`${th} text-right`}>Net (ct)</th>
                        <th className={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ebe3]">
                      {[...inStock, ...outOfStock].map(g => (
                        <tr key={`${g.shape}|${g.size}|${g.colour}`} className="hover:bg-[#f8f5f0]/60">
                          <td className={`${tdR} font-mono`}>{g.shape}</td>
                          <td className={`${tdR} font-mono`}>{g.size}</td>
                          <td className={tdR}>{fmtColour(g.colour)}</td>
                          <td className={`${tdR} text-right`}>{g.inPcs}</td>
                          <td className={`${tdR} text-right`}>{g.outPcs}</td>
                          <td className={`${tdR} text-right font-semibold ${g.netPcs > 0 ? 'text-[#456158]' : 'text-red-600'}`}>{g.netPcs}</td>
                          <td className={`${tdR} text-right`}>{g.inCt.toFixed(3)}</td>
                          <td className={`${tdR} text-right`}>{g.outCt.toFixed(3)}</td>
                          <td className={`${tdR} text-right font-semibold ${g.netCt > 0 ? 'text-[#456158]' : 'text-red-600'}`}>{g.netCt.toFixed(3)}</td>
                          <td className={tdR}>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${g.netPcs > 0 ? 'bg-[#e8efed] text-[#456158]' : 'bg-red-50 text-red-600'}`}>
                              {g.netPcs > 0 ? 'In Stock' : 'Deficit'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#f8f5f0] border-t border-[#e0d8ce] font-semibold">
                        <td className={tdR} colSpan={3}>Totals</td>
                        <td className={`${tdR} text-right`}>{stockTotals.inPcs}</td>
                        <td className={`${tdR} text-right`}>{stockTotals.outPcs}</td>
                        <td className={`${tdR} text-right`}>{stockTotals.netPcs}</td>
                        <td className={`${tdR} text-right`}>{stockTotals.inCt.toFixed(3)}</td>
                        <td className={`${tdR} text-right`}>{stockTotals.outCt.toFixed(3)}</td>
                        <td className={`${tdR} text-right`}>{stockTotals.netCt.toFixed(3)}</td>
                        <td className={tdR} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <ManageListSection
              title="Manage shapes"
              subtitle="Add or remove diamond shapes available in the entry form."
              field="shapes"
              values={shapes}
              onChanged={fetchAll}
            />
            <ManageListSection
              title="Manage colours"
              subtitle="Add or remove colours. White is always available as default."
              field="colours"
              values={colours}
              excludeValue="WHITE"
              displayFn={v => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()}
              onChanged={fetchAll}
            />
            <ManageListSection
              title="Manage sizes"
              subtitle="Add or remove sizes from the searchable list."
              field="sizes"
              values={sizes}
              onChanged={fetchAll}
            />

            <div className="bg-white rounded-lg border border-red-200 shadow-sm p-4">
              <h2 className="text-sm font-bold text-[#1a1a1a] mb-1">Data Management</h2>
              <p className="text-sm text-red-600 mb-4">Delete all data — cannot be undone.</p>
              <DeleteAllDataButton onDeleted={fetchAll} />
            </div>
          </div>
        )}

      </div>

      {correctionTarget && (
        <CorrectionModal
          group={correctionTarget}
          onClose={() => setCorrectionTarget(null)}
          onSaved={async () => {
            await fetchAll();
            await fetchStock();
            setCorrectionTarget(null);
          }}
        />
      )}
    </div>
  );
}
