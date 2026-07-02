'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoneLine {
  stoneType?: string; shape?: string; size?: string; colour?: string;
  count?: number; totalWeight?: number; setting?: string; remarks?: string;
}

interface ChangelogEntry {
  field: string; oldValue?: unknown; newValue?: unknown; changedAt: string;
}

interface GoldWeights {
  nineKt?: number;
  fourteenKt?: number;
  eighteenKt?: number;
}

interface ProductVersion {
  _id: string;
  versionNumber: number;
  name?: string | null;
  size?: string;
  goldWeights?: GoldWeights;
  totalDiamondWeight?: number; totalDiamondPcs?: number;
  totalColourStoneWeight?: number; totalColourstonePcs?: number;
  rhodiumInstruction?: string; remarks?: string;
  stoneLines: StoneLine[];
  createdAt: string;
}

interface Product {
  _id: string; designNumber: string;
  category?: string; categoryCode?: string;
  style?: string; styleCode?: string; queueCode?: string;
  size?: string; cadImageUrl?: string; referenceImageUrl?: string | null;
  goldWeights?: GoldWeights;
  totalDiamondWeight?: number; totalDiamondPcs?: number;
  totalColourStoneWeight?: number; totalColourstonePcs?: number;
  rhodiumInstruction?: string;
  status: string; remarks?: string;
  stoneLines: StoneLine[];
  versions: ProductVersion[];
  changelog: ChangelogEntry[];
}

interface LocalLine {
  stoneType: string; shape: string; sizeLength: string; sizeWidth: string; colour: string;
  count?: number; totalWeight?: number; setting: string; remarks: string;
}

interface VersionDraft {
  name: string;
  size: string;
  goldWeightNine: string; goldWeightFourteen: string; goldWeightEighteen: string;
  rhodiumInstruction: string; remarks: string;
  stoneLines: LocalLine[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  'Pending':            'bg-gray-100 text-gray-600 border border-gray-200',
  'Needs Manual Check': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Hold':               'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Rejected':           'bg-red-50 text-red-600 border border-red-200',
  'Approved':           'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const STATUSES = ['Pending', 'Needs Manual Check', 'Hold', 'Rejected', 'Approved'];
const STONE_TYPES = ['Diamond','Colourstone','Colored Diamond','Pearl'];
const SHAPES = ['ROUND','PEAR','MARQUISE','OVAL','PRINCESS','CUSHION','EMERALD','RADIANT','BAGUETTE','HEART','TRILLION','LOZENGE'] as const;

const EMPTY_LOCAL_LINE: LocalLine = {
  stoneType: 'Diamond', shape: '', sizeLength: '', sizeWidth: '', colour: 'WHITE',
  count: undefined, totalWeight: undefined, setting: '', remarks: '',
};

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

function emptyVersionDraft(): VersionDraft {
  return {
    name: '', size: '',
    goldWeightNine: '', goldWeightFourteen: '', goldWeightEighteen: '',
    rhodiumInstruction: '', remarks: '', stoneLines: [],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gdEmbed(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : null;
}

function fmtSize(s?: string): string { return s || '—'; }

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtField(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function parseSizeStr(size?: string) {
  if (!size) return { len: '', wid: '' };
  const x = size.indexOf('X');
  return x !== -1 ? { len: size.slice(0, x), wid: size.slice(x + 1) } : { len: size, wid: '' };
}

function formatSizeStr(len: string, wid: string): string | undefined {
  if (!len) return undefined;
  const l = parseFloat(len).toFixed(2);
  return wid ? `${l}X${parseFloat(wid).toFixed(2)}` : l;
}

function toLocalLine(sl: StoneLine): LocalLine {
  const { len, wid } = parseSizeStr(sl.size);
  return { stoneType: sl.stoneType ?? '', shape: sl.shape ?? '', sizeLength: len, sizeWidth: wid, colour: sl.colour ?? 'WHITE', count: sl.count, totalWeight: sl.totalWeight, setting: sl.setting ?? '', remarks: sl.remarks ?? '' };
}

function fromLocalLine(ll: LocalLine): StoneLine {
  return { stoneType: ll.stoneType || undefined, shape: ll.shape || undefined, size: formatSizeStr(ll.sizeLength, ll.sizeWidth), colour: ll.colour || 'WHITE', count: ll.count, totalWeight: ll.totalWeight, setting: ll.setting || undefined, remarks: ll.remarks || undefined };
}

// ── Size selector ─────────────────────────────────────────────────────────────

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

function getSizeType(category?: string): 'ring' | 'bangle' | 'necklace' | 'free' {
  if (category === 'Ring')     return 'ring';
  if (category === 'Bracelet') return 'bangle';
  if (category === 'Necklace' || category === 'Necklace Earrings' || category === 'Chain Pendant') return 'necklace';
  return 'free';
}

function SizeSelector({ category, value, onChange, className, onEnter }: {
  category?: string; value: string; onChange: (v: string) => void;
  className?: string; onEnter?: () => void;
}) {
  const type = getSizeType(category);
  const cls = className ?? 'flex-1 min-w-0 rounded-lg border border-brand/30 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';
  if (type === 'ring') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">Select ring size…</option>
        {RING_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (type === 'bangle') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">Select size…</option>
        {BANGLE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (type === 'necklace') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">Select length…</option>
        {NECKLACE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      placeholder="e.g. 50mm" className={cls} />
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>;
}
function CheckIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>;
}
function XSmall() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>;
}
function XIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>;
}
function PlusIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" d="M12 4v16m8-8H4"/></svg>;
}
function TrashIcon() {
  return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
}
function ChevronDown({ open }: { open: boolean }) {
  return <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 9l6 6 6-6"/></svg>;
}
function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}
function PencilTiny() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// ── Inline editable field ─────────────────────────────────────────────────────

interface FieldProps {
  label: string; display: string; editValue: string;
  onSave: (v: string) => Promise<void>;
  inputType?: 'text' | 'number'; step?: string; placeholder?: string;
}

function Field({ label, display, editValue, onSave, inputType = 'text', step, placeholder }: FieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() { setDraft(editValue); setEditing(true); setErr(null); }

  async function save() {
    setSaving(true); setErr(null);
    try { await onSave(draft); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f8f5f0] last:border-0">
      <span className="w-44 shrink-0 text-xs text-[#6b6560] pt-1">{label}</span>
      {editing ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <input ref={inputRef} type={inputType} step={step} value={draft} placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 min-w-0 rounded-lg border border-brand/30 px-2.5 py-1.5 text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 shrink-0 transition-colors">
              {saving ? <Spinner /> : <CheckIcon />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] shrink-0 transition-colors">
              <XSmall />
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      ) : (
        <button onClick={startEdit}
          className="flex-1 text-left text-sm text-[#1a1a1a] hover:bg-[#f8f5f0] rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-h-[24px]">
          {display}
        </button>
      )}
    </div>
  );
}

// ── Select field ──────────────────────────────────────────────────────────────

function SelectField({ label, display, value, options, onSave }: {
  label: string; display: string; value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function startEdit() { setDraft(value); setEditing(true); setErr(null); }

  async function save() {
    setSaving(true); setErr(null);
    try { await onSave(draft); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f8f5f0] last:border-0">
      <span className="w-44 shrink-0 text-xs text-[#6b6560] pt-1">{label}</span>
      {editing ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <select value={draft} onChange={e => setDraft(e.target.value)} autoFocus
              className="flex-1 rounded-lg border border-brand/30 px-2.5 py-1.5 text-sm bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 shrink-0 transition-colors">
              {saving ? <Spinner /> : <CheckIcon />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] shrink-0 transition-colors">
              <XSmall />
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      ) : (
        <button onClick={startEdit}
          className="flex-1 text-left text-sm text-[#1a1a1a] hover:bg-[#f8f5f0] rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-h-[24px]">
          {display}
        </button>
      )}
    </div>
  );
}

// ── Category field ────────────────────────────────────────────────────────────

function CategoryField({ category, onSave }: {
  category?: string;
  onSave: (cat: string | undefined) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function startEdit() { setDraft(category ?? ''); setEditing(true); setErr(null); }

  async function save() {
    setSaving(true); setErr(null);
    try { await onSave(draft || undefined); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f8f5f0] last:border-0">
      <span className="w-44 shrink-0 text-xs text-[#6b6560] pt-1">Category</span>
      {editing ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <select value={draft} onChange={e => setDraft(e.target.value)} autoFocus
              className="flex-1 rounded-lg border border-brand/30 px-2.5 py-1.5 text-sm bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
              <option value="">— select category —</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 shrink-0 transition-colors">
              {saving ? <Spinner /> : <CheckIcon />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] shrink-0 transition-colors">
              <XSmall />
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      ) : (
        <button onClick={startEdit}
          className="flex-1 text-left text-sm text-[#1a1a1a] hover:bg-[#f8f5f0] rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-h-[24px]">
          {category || '—'}
        </button>
      )}
    </div>
  );
}

// ── Style field ───────────────────────────────────────────────────────────────

function StyleField({ style, category, onSave }: {
  style?: string;
  category?: string;
  onSave: (style: string | undefined) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const styleOptions = CATEGORY_MAP[category ?? '']?.styles ?? [];

  function startEdit() { setDraft(style ?? ''); setEditing(true); setErr(null); }

  async function save() {
    setSaving(true); setErr(null);
    try { await onSave(draft || undefined); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f8f5f0] last:border-0">
      <span className="w-44 shrink-0 text-xs text-[#6b6560] pt-1">Style</span>
      {editing ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <select value={draft} onChange={e => setDraft(e.target.value)} autoFocus
              className="flex-1 rounded-lg border border-brand/30 px-2.5 py-1.5 text-sm bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
              <option value="">— select style —</option>
              {styleOptions.map(s => <option key={s.code} value={s.label}>{s.label}</option>)}
            </select>
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 shrink-0 transition-colors">
              {saving ? <Spinner /> : <CheckIcon />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] shrink-0 transition-colors">
              <XSmall />
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      ) : (
        <button onClick={startEdit}
          className="flex-1 text-left text-sm text-[#1a1a1a] hover:bg-[#f8f5f0] rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-h-[24px]">
          {style || '—'}
        </button>
      )}
    </div>
  );
}

// ── Size field ────────────────────────────────────────────────────────────────

function SizeField({ size, category, onSave }: {
  size?: string;
  category?: string;
  onSave: (v: string | undefined) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  function startEdit() { setDraft(size ?? ''); setEditing(true); setErr(null); }

  async function save() {
    setSaving(true); setErr(null);
    try { await onSave(draft || undefined); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f8f5f0] last:border-0">
      <span className="w-44 shrink-0 text-xs text-[#6b6560] pt-1">Size</span>
      {editing ? (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <SizeSelector category={category} value={draft} onChange={setDraft} onEnter={save} />
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 shrink-0 transition-colors">
              {saving ? <Spinner /> : <CheckIcon />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] shrink-0 transition-colors">
              <XSmall />
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      ) : (
        <button onClick={startEdit}
          className="flex-1 text-left text-sm text-[#1a1a1a] hover:bg-[#f8f5f0] rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-h-[24px]">
          {fmtSize(size)}
        </button>
      )}
    </div>
  );
}

// ── Gold Karat field ──────────────────────────────────────────────────────────

function fmtGoldWeights(gw?: GoldWeights): string {
  if (!gw) return '—';
  const parts: string[] = [];
  if (gw.nineKt     != null) parts.push(`9KT • ${gw.nineKt}g`);
  if (gw.fourteenKt != null) parts.push(`14KT • ${gw.fourteenKt}g`);
  if (gw.eighteenKt != null) parts.push(`18KT • ${gw.eighteenKt}g`);
  return parts.length ? parts.join(', ') : '—';
}

function GoldWeightsField({ value, onSave }: {
  value?: GoldWeights;
  onSave: (v: GoldWeights) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [nine, setNine]         = useState('');
  const [fourteen, setFourteen] = useState('');
  const [eighteen, setEighteen] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function startEdit() {
    setNine(value?.nineKt       != null ? String(value.nineKt)     : '');
    setFourteen(value?.fourteenKt != null ? String(value.fourteenKt) : '');
    setEighteen(value?.eighteenKt != null ? String(value.eighteenKt) : '');
    setEditing(true); setErr(null);
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      await onSave({
        nineKt:     nine     ? parseFloat(nine)     : undefined,
        fourteenKt: fourteen ? parseFloat(fourteen) : undefined,
        eighteenKt: eighteen ? parseFloat(eighteen) : undefined,
      });
      setEditing(false);
    }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  const rows: [string, string, React.Dispatch<React.SetStateAction<string>>][] = [
    ['9KT',  nine,     setNine],
    ['14KT', fourteen, setFourteen],
    ['18KT', eighteen, setEighteen],
  ];

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#f8f5f0] last:border-0">
      <span className="w-44 shrink-0 text-xs text-[#6b6560] pt-1">Gold Weight (g)</span>
      {editing ? (
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border border-[#ddd5c8] overflow-hidden mb-2">
            {rows.map(([label, val, setVal]) => (
              <div key={label} className="flex items-center border-b border-[#f0ebe3] last:border-0">
                <span className="w-12 shrink-0 pl-2.5 text-xs font-semibold text-[#6b6560]">{label}</span>
                <input type="number" min="0" step="0.001" placeholder="—" value={val}
                  onChange={e => setVal(e.target.value)}
                  className="flex-1 py-1.5 px-2 text-sm bg-white border-l border-[#f0ebe3] focus:outline-none focus:bg-brand/[0.03]"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand/90 disabled:opacity-50 shrink-0 transition-colors">
              {saving ? <Spinner /> : <CheckIcon />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-lg border border-[#ddd5c8] text-[#6b6560] flex items-center justify-center hover:bg-[#f0ebe3] shrink-0 transition-colors">
              <XSmall />
            </button>
          </div>
          {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
        </div>
      ) : (
        <button onClick={startEdit}
          className="flex-1 text-left text-sm text-[#1a1a1a] hover:bg-[#f8f5f0] rounded px-1.5 py-0.5 -ml-1.5 transition-colors min-h-[24px]">
          {fmtGoldWeights(value)}
        </button>
      )}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 ${checked ? 'bg-brand' : 'bg-gray-200'}`}>
      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Stone line row (edit mode) ────────────────────────────────────────────────

interface GaugeHint {
  caratPerStone: number;
  avgRatePerCt: number | null;
  isExact: boolean;
  matchedSizeStr: string;
}

function StoneLineRowEdit({
  sl, i, onUpdate, onRemove, compact = false,
}: {
  sl: LocalLine;
  i: number;
  onUpdate: (i: number, f: keyof LocalLine, v: string | number | undefined) => void;
  onRemove: (i: number) => void;
  compact?: boolean;
}) {
  const [gauge, setGauge] = useState<GaugeHint | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  useEffect(() => {
    if (!sl.shape || !sl.sizeLength) { setGauge(null); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ shape: sl.shape, L: sl.sizeLength });
        if (sl.sizeWidth) p.set('W', sl.sizeWidth);
        const res = await fetch(`/api/gauge/lookup?${p}`);
        if (!res.ok) return;
        setGauge(await res.json());
      } catch { /* network error */ }
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [sl.shape, sl.sizeLength, sl.sizeWidth]);

  useEffect(() => {
    if (!gauge) return;
    const cnt = sl.count ?? 0;
    onUpdateRef.current(i, 'totalWeight', parseFloat((cnt * gauge.caratPerStone).toFixed(3)));
  }, [sl.count, gauge, i]);

  const estCost = (() => {
    if (!gauge) return null;
    if (gauge.avgRatePerCt == null) return 'Cost N/A';
    const tw = sl.totalWeight ?? 0;
    return `₹ ${Math.round(tw * gauge.avgRatePerCt).toLocaleString('en-IN')}`;
  })();

  const td  = 'px-1.5 py-1.5';
  const inp = 'rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand';
  const w   = compact
    ? { type: 'w-[108px]', shape: 'w-[100px]', sz: 'w-[44px]', col: 'w-[60px]', cnt: 'w-[46px]', wt: 'w-[58px]', txt: 'w-[62px]' }
    : { type: 'w-[118px]', shape: 'w-[110px]', sz: 'w-[48px]', col: 'w-[64px]', cnt: 'w-[52px]', wt: 'w-[64px]', txt: 'w-[70px]' };

  return (
    <>
      <tr>
        <td className={td}>
          <select value={sl.stoneType} onChange={e => onUpdate(i, 'stoneType', e.target.value)}
            className={`${inp} ${w.type} bg-white`}>
            <option value="">Type…</option>
            {STONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td className={td}>
          <select value={sl.shape} onChange={e => onUpdate(i, 'shape', e.target.value)}
            className={`${inp} ${w.shape} bg-white`}>
            <option value="">—</option>
            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td className={td}>
          <div className="flex items-center gap-0.5">
            <input type="number" min="0" step="0.01" placeholder="L" className={`${inp} ${w.sz}`}
              value={sl.sizeLength} onChange={e => onUpdate(i, 'sizeLength', e.target.value)} />
            <span className="text-gray-300 text-[10px] px-0.5">×</span>
            <input type="number" min="0" step="0.01" placeholder="W" className={`${inp} ${w.sz}`}
              value={sl.sizeWidth} onChange={e => onUpdate(i, 'sizeWidth', e.target.value)} />
          </div>
          {gauge && (
            <p className="text-[10px] text-gray-400 mt-0.5">{gauge.caratPerStone} ct/stone</p>
          )}
        </td>
        <td className={td}>
          <input type="text" placeholder="WHITE" className={`${inp} ${w.col}`}
            value={sl.colour} onChange={e => onUpdate(i, 'colour', e.target.value.toUpperCase())} />
        </td>
        <td className={td}>
          <input type="number" min="0" step="1" className={`${inp} ${w.cnt}`} placeholder="0"
            value={sl.count ?? ''} onChange={e => onUpdate(i, 'count', e.target.value ? parseInt(e.target.value) : undefined)} />
        </td>
        <td className={td}>
          <input type="number" min="0" step="0.001" className={`${inp} ${w.wt}`} placeholder="0.000"
            value={sl.totalWeight ?? ''} onChange={e => onUpdate(i, 'totalWeight', e.target.value ? parseFloat(e.target.value) : undefined)} />
          {estCost && (
            <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{estCost}</p>
          )}
        </td>
        <td className={td}>
          <input type="text" className={`${inp} ${w.txt}`} placeholder="—"
            value={sl.setting} onChange={e => onUpdate(i, 'setting', e.target.value)} />
        </td>
        <td className={td}>
          <input type="text" className={`${inp} ${w.txt}`} placeholder="—"
            value={sl.remarks} onChange={e => onUpdate(i, 'remarks', e.target.value)} />
        </td>
        <td className="px-2 py-1.5 text-center">
          <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-400 transition-colors"><TrashIcon /></button>
        </td>
      </tr>
      {gauge && !gauge.isExact && (
        <tr>
          <td colSpan={9} className="px-3 pb-1.5 pt-0">
            <span className="inline-flex items-center text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
              Nearest match: {gauge.matchedSizeStr}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Stone lines table ─────────────────────────────────────────────────────────

function StoneLines({ initial, onSave }: { initial: StoneLine[]; onSave: (lines: StoneLine[]) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [lines, setLines]     = useState<LocalLine[]>(() => initial.map(toLocalLine));
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  useEffect(() => { setLines(initial.map(toLocalLine)); }, [initial]);

  function enterEdit() { setLines(initial.map(toLocalLine)); setEditing(true); setErr(null); }
  function cancel()    { setLines(initial.map(toLocalLine)); setEditing(false); setErr(null); }

  function setLine(i: number, f: keyof LocalLine, v: string | number | undefined) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [f]: v } : l));
  }
  function addLine()             { setLines(ls => [...ls, { ...EMPTY_LOCAL_LINE }]); }
  function removeLine(i: number) { setLines(ls => ls.filter((_, idx) => idx !== i)); }

  async function save() {
    setSaving(true); setErr(null);
    try { await onSave(lines.map(fromLocalLine)); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  const th  = 'px-2.5 py-2.5 text-left text-[11px] font-semibold text-[#6b6560] uppercase tracking-wider whitespace-nowrap';
  const tdR = 'px-2.5 py-3 text-xs text-[#1a1a1a]';

  const displayLines = editing ? lines : initial.map(toLocalLine);
  const DIA = new Set(['Diamond', 'Colored Diamond']);
  const COL = new Set(['Colourstone', 'Pearl']);
  const dLines = displayLines.filter(l => DIA.has(l.stoneType));
  const cLines = displayLines.filter(l => COL.has(l.stoneType));
  const hasTotals = dLines.length > 0 || cLines.length > 0;

  return (
    <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-[#1a1a1a]">Stone Lines</h2>
        <div className="flex items-center gap-2">
          {err && <p className="text-xs text-red-500">{err}</p>}
          {!editing ? (
            <button onClick={enterEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand border border-brand/30 rounded-lg hover:bg-brand/5 transition-colors">
              <PencilTiny /> Edit Stone Lines
            </button>
          ) : (
            <>
              <button onClick={cancel} disabled={saving}
                className="px-3 py-1.5 text-xs font-semibold text-[#6b6560] border border-[#ddd5c8] rounded-lg hover:bg-[#f8f5f0] disabled:opacity-50 transition-colors">
                Cancel
              </button>
              <button onClick={addLine}
                className="text-xs font-semibold text-brand hover:text-brand/70 transition-colors">+ Add Row</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 transition-colors shadow-sm">
                {saving ? <Spinner /> : null}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* READ-ONLY VIEW */}
      {!editing && (
        displayLines.length === 0 ? (
          <button onClick={enterEdit}
            className="w-full py-6 border border-dashed border-[#ddd5c8] rounded-lg text-xs text-[#6b6560] hover:border-brand/40 hover:text-brand/70 transition-colors">
            + Add stone lines
          </button>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e8e0d4]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                  <th className={th}>Stone Type</th>
                  <th className={th}>Shape</th>
                  <th className={th}>Size</th>
                  <th className={th}>Colour</th>
                  <th className={`${th} text-right`}>Count</th>
                  <th className={`${th} text-right`}>Wt ct</th>
                  <th className={th}>Setting</th>
                  <th className={th}>Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe3]">
                {displayLines.map((sl, i) => (
                  <tr key={i} className="hover:bg-[#f8f5f0]/60">
                    <td className={tdR}>{sl.stoneType || '—'}</td>
                    <td className={`${tdR} font-mono`}>{sl.shape || '—'}</td>
                    <td className={`${tdR} font-mono`}>
                      {sl.sizeLength
                        ? (sl.sizeWidth ? `${sl.sizeLength} × ${sl.sizeWidth}` : sl.sizeLength)
                        : '—'}
                    </td>
                    <td className={tdR}>{sl.colour || '—'}</td>
                    <td className={`${tdR} text-right`}>{sl.count ?? '—'}</td>
                    <td className={`${tdR} text-right`}>{sl.totalWeight != null ? sl.totalWeight.toFixed(3) : '—'}</td>
                    <td className={tdR}>{sl.setting || '—'}</td>
                    <td className={tdR}>{sl.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* EDIT VIEW */}
      {editing && (
        lines.length === 0 ? (
          <button onClick={addLine}
            className="w-full py-6 border border-dashed border-[#ddd5c8] rounded-lg text-xs text-[#6b6560] hover:border-brand/40 hover:text-brand/70 transition-colors">
            + Add a stone line
          </button>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e8e0d4]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#f0ebe3] border-b border-[#e0d8ce]">
                  <th className={th}>Stone Type</th>
                  <th className={th}>Shape</th>
                  <th className={`${th} whitespace-nowrap`}>Size (L×W)</th>
                  <th className={th}>Colour</th>
                  <th className={th}>Count</th>
                  <th className={th}>Total Wt ct</th>
                  <th className={th}>Setting</th>
                  <th className={th}>Remarks</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe3]">
                {lines.map((sl, i) => (
                  <StoneLineRowEdit key={i} sl={sl} i={i} onUpdate={setLine} onRemove={removeLine} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Calculated totals */}
      {hasTotals && (
        <div className="mt-4 pt-4 border-t border-[#f0ebe3]">
          <p className="text-[10px] font-bold text-gold uppercase tracking-[0.14em] mb-2">Calculated Totals</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {dLines.length > 0 && <>
              <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[#6b6560] mb-0.5">Diamond Weight</p>
                <p className="text-sm font-semibold text-[#1a1a1a]">{dLines.reduce((s, l) => s + (l.totalWeight ?? 0), 0).toFixed(3)} ct</p>
              </div>
              <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[#6b6560] mb-0.5">Diamond Pcs</p>
                <p className="text-sm font-semibold text-[#1a1a1a]">{dLines.reduce((s, l) => s + (l.count ?? 0), 0)}</p>
              </div>
            </>}
            {cLines.length > 0 && <>
              <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[#6b6560] mb-0.5">Colourstone Weight</p>
                <p className="text-sm font-semibold text-[#1a1a1a]">{cLines.reduce((s, l) => s + (l.totalWeight ?? 0), 0).toFixed(3)} ct</p>
              </div>
              <div className="bg-[#f8f5f0] rounded-lg px-3 py-2">
                <p className="text-[10px] text-[#6b6560] mb-0.5">Colourstone Pcs</p>
                <p className="text-sm font-semibold text-[#1a1a1a]">{cLines.reduce((s, l) => s + (l.count ?? 0), 0)}</p>
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Change log ────────────────────────────────────────────────────────────────

// ── Changelog display helpers ─────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  designNumber:           'Design Number',
  category:               'Category',
  categoryCode:           'Category Code',
  style:                  'Style',
  styleCode:              'Style Code',
  queueCode:              'Queue Code',
  size:                   'Size',
  cadImageUrl:            'CAD Image URL',
  goldWeights:            'Gold Weights',
  totalDiamondWeight:     'Total Diamond Weight',
  totalDiamondPcs:        'Total Diamond Pcs',
  totalColourStoneWeight: 'Total Colourstone Weight',
  totalColourstonePcs:    'Total Colourstone Pcs',
  rhodiumInstruction:     'Rhodium Instruction',
  status:                 'Status',
  remarks:                'Remarks',
  additionalImages:       'Additional Images',
};

function camelToHuman(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

function fmtScalar(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return String(parseFloat(v.toFixed(6)));
  if (typeof v === 'object') {
    const s = v as Record<string, unknown>;
    if ('length' in s || 'width' in s) {
      if (!s.length) return '(empty)';
      const u = (s.unit ?? 'mm') as string;
      return s.width ? `${s.length}×${s.width} ${u}` : `${s.length} ${u}`;
    }
    return JSON.stringify(v);
  }
  return String(v);
}

function Val({ v }: { v: unknown }) {
  return <span className="font-mono bg-gray-50 border border-gray-100 px-1 py-px rounded">{fmtScalar(v)}</span>;
}

function renderEntryBody(e: ChangelogEntry): React.ReactNode {
  const { field, oldValue, newValue } = e;

  // Version-prefixed fields: v2.goldWeight, v2.stoneLines
  const vMatch = field.match(/^v(\d+)\.(.+)$/);
  const vPrefix = vMatch ? `V${vMatch[1]} · ` : '';
  const rawField = vMatch ? vMatch[2] : field;

  // Stone lines (any level)
  if (rawField === 'stoneLines') {
    return <><span className="font-medium text-gray-900">{vPrefix}Stone Lines</span>{' — '}stone lines updated</>;
  }

  // Versions array
  if (rawField === 'versions') {
    const action = typeof newValue === 'string' ? newValue : 'Version updated';
    return <><span className="font-medium text-gray-900">Versions</span>{' — '}{action}</>;
  }

  // Scalar fields
  const humanField = FIELD_LABELS[rawField] ?? camelToHuman(rawField);
  const label = vPrefix + humanField;
  const isNew = oldValue === null || oldValue === undefined || oldValue === '';

  return (
    <>
      <span className="font-medium text-gray-900">{label}</span>
      {isNew
        ? <>{' — '}set to <Val v={newValue} /></>
        : <>{' — '}changed from <Val v={oldValue} /> to <Val v={newValue} /></>
      }
    </>
  );
}

function ChangeLog({ entries }: { entries: ChangelogEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_16px_rgba(26,26,26,0.06)] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-[#1a1a1a] hover:bg-[#f8f5f0] transition-colors">
        <span>Change Log <span className="ml-1.5 text-xs font-normal text-[#6b6560]">({entries.length} {entries.length === 1 ? 'entry' : 'entries'})</span></span>
        <ChevronDown open={open} />
      </button>
      {open && (
        <div className="border-t border-[#f0ebe3] px-6 py-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-xs text-[#6b6560]">No changes recorded yet.</p>
          ) : (
            [...entries].reverse().map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className="text-[#6b6560] shrink-0 pt-0.5 whitespace-nowrap">{fmtDate(e.changedAt)}</span>
                <span className="text-[#1a1a1a] leading-relaxed">{renderEntryBody(e)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Add Version Drawer ────────────────────────────────────────────────────────

function AddVersionDrawer({ open, initialDraft, category, onClose, onSubmit }: {
  open: boolean;
  initialDraft: VersionDraft;
  category?: string;
  onClose: () => void;
  onSubmit: (draft: VersionDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<VersionDraft>(initialDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setDraft(initialDraft); setError(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function setD<K extends keyof VersionDraft>(k: K, v: VersionDraft[K]) {
    setDraft(p => ({ ...p, [k]: v }));
  }
  function setLine(i: number, f: keyof LocalLine, v: string | number | undefined) {
    setDraft(p => ({ ...p, stoneLines: p.stoneLines.map((l, idx) => idx === i ? { ...l, [f]: v } : l) }));
  }
  function addLine() { setDraft(p => ({ ...p, stoneLines: [...p.stoneLines, { ...EMPTY_LOCAL_LINE }] })); }
  function removeLine(i: number) { setDraft(p => ({ ...p, stoneLines: p.stoneLines.filter((_, idx) => idx !== i) })); }

  async function handleSubmit() {
    setSubmitting(true); setError(null);
    try { await onSubmit(draft); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to create version'); }
    finally { setSubmitting(false); }
  }

  const inp = 'w-full rounded-lg border border-[#ddd5c8] px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#6b6560]/50 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors';
  const lbl = 'block text-xs font-medium text-[#6b6560] mb-1';
  const sec = 'block text-[10px] font-bold text-gold uppercase tracking-[0.14em] mb-3';
  const tinp = 'rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand/25 focus:border-brand w-full';
  const th = 'px-2.5 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap';
  const td = 'px-1.5 py-1.5';

  return (
    <>
      <div aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div role="dialog" aria-label="Add Version"
        className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 'min(680px, 100vw)' }}
      >
        {/* Green accent bar */}
        <div className="h-1 bg-brand shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0ebe3] shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#1a1a1a]">Add Version</h2>
            <p className="text-xs text-[#6b6560] mt-0.5">Pre-filled from the active tab — edit as needed before saving</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#f0ebe3] transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          )}

          {/* Version Name */}
          <div>
            <label className={sec}>Version Name</label>
            <input
              className={inp}
              type="text"
              placeholder="e.g. 2.7 inch Bangle — leave blank for default V2 label"
              value={draft.name}
              onChange={e => setD('name', e.target.value)}
            />
          </div>

          {/* Size */}
          <div>
            <label className={sec}>Size</label>
            <SizeSelector
              category={category}
              value={draft.size}
              onChange={v => setD('size', v)}
              className={inp}
            />
          </div>

          {/* Gold */}
          <div className="border-t border-[#f0ebe3] pt-5 space-y-3">
            <label className={sec}>Gold</label>
            <div>
              <label className={lbl}>Gold Weight (g)</label>
              <div className="rounded-lg border border-[#ddd5c8] overflow-hidden">
                {([['9KT', 'goldWeightNine'], ['14KT', 'goldWeightFourteen'], ['18KT', 'goldWeightEighteen']] as const).map(([label, field]) => (
                  <div key={label} className="flex items-center border-b border-[#f0ebe3] last:border-0">
                    <span className="w-14 shrink-0 pl-3 text-xs font-semibold text-[#6b6560]">{label}</span>
                    <input className="flex-1 py-2 px-2.5 text-sm bg-white border-l border-[#f0ebe3] focus:outline-none focus:bg-brand/[0.03]"
                      type="number" min="0" step="0.001" placeholder="—"
                      value={draft[field]} onChange={e => setD(field, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Production */}
          <div className="border-t border-[#f0ebe3] pt-5 space-y-3">
            <label className={sec}>Production</label>
            <div>
              <label className={lbl}>Rhodium Instruction</label>
              <input className={inp} type="text" placeholder="e.g. Full rhodium, No rhodium, Partial"
                value={draft.rhodiumInstruction} onChange={e => setD('rhodiumInstruction', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Remarks</label>
              <textarea className={`${inp} resize-none`} rows={3} placeholder="Notes about this version…"
                value={draft.remarks} onChange={e => setD('remarks', e.target.value)} />
            </div>
          </div>

          {/* Stone Lines */}
          <div className="border-t border-[#f0ebe3] pt-5">
            <div className="flex items-center justify-between mb-3">
              <label className={sec}>Stone Lines</label>
              <button type="button" onClick={addLine}
                className="text-xs font-semibold text-brand hover:text-brand/70 transition-colors">+ Add Row</button>
            </div>
            {draft.stoneLines.length === 0 ? (
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
                        <th className={th}>Stone Type</th>
                        <th className={th}>Shape</th>
                        <th className={`${th} whitespace-nowrap`}>Size (L×W)</th>
                        <th className={th}>Colour</th>
                        <th className={th}>Count</th>
                        <th className={th}>Wt ct</th>
                        <th className={th}>Setting</th>
                        <th className={th}>Remarks</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {draft.stoneLines.map((sl, i) => (
                        <StoneLineRowEdit key={i} sl={sl} i={i} compact onUpdate={setLine} onRemove={removeLine} />
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
              const dLines = draft.stoneLines.filter(l => DIA.has(l.stoneType));
              const cLines = draft.stoneLines.filter(l => COL.has(l.stoneType));
              if (!dLines.length && !cLines.length) return null;
              const dWeight = dLines.reduce((s, l) => s + (l.totalWeight ?? 0), 0);
              const dPcs    = dLines.reduce((s, l) => s + (l.count ?? 0), 0);
              const cWeight = cLines.reduce((s, l) => s + (l.totalWeight ?? 0), 0);
              const cPcs    = cLines.reduce((s, l) => s + (l.count ?? 0), 0);
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

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f0ebe3] bg-white">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#6b6560] bg-white border border-[#ddd5c8] rounded-lg hover:bg-[#f8f5f0] transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm">
            {submitting && <Spinner />}
            Create Version
          </button>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const [cadDraft, setCadDraft] = useState('');
  const [cadSaving, setCadSaving] = useState(false);
  const [cadErr, setCadErr] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const [refImgMode, setRefImgMode]             = useState<'url' | 'upload'>('url');
  const [refUrlDraft, setRefUrlDraft]           = useState('');
  const [refSaving, setRefSaving]               = useState(false);
  const [refSaveErr, setRefSaveErr]             = useState<string | null>(null);
  const [refUploading, setRefUploading]         = useState(false);
  const [refUploadErr, setRefUploadErr]         = useState<string | null>(null);
  const [refUploadPreview, setRefUploadPreview] = useState('');


  // Version tabs
  const [activeTab, setActiveTab] = useState(1);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versionDraftInitial, setVersionDraftInitial] = useState<VersionDraft>(emptyVersionDraft);

  // Tab renaming
  const [renameTabNum, setRenameTabNum] = useState<number | null>(null);
  const [renameDraft, setRenameDraft]   = useState('');
  const [renaming, setRenaming]         = useState(false);
  const [renameErr, setRenameErr]       = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    setLoading(true); setFetchErr(null);
    try {
      const res = await fetch(`/api/products/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Not found');
      const p: Product = await res.json();
      setProduct(p);
      setCadDraft(p.cadImageUrl ?? '');
      setRefUrlDraft(p.referenceImageUrl ?? '');
      setRefUploadPreview('');
      setImgFailed(false);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  async function putField(body: Record<string, unknown>) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(e.message ?? 'Save failed');
    }
    const updated: Product = await res.json();
    setProduct(updated);
    return updated;
  }

  async function putVersionField(versionNumber: number, body: Record<string, unknown>) {
    const res = await fetch(`/api/products/${id}/versions/${versionNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(e.message ?? 'Save failed');
    }
    const updated: Product = await res.json();
    setProduct(updated);
    return updated;
  }

  async function saveCad() {
    setCadSaving(true); setCadErr(null);
    try { await putField({ cadImageUrl: cadDraft.trim() || undefined }); setImgFailed(false); }
    catch (e) { setCadErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setCadSaving(false); }
  }

  async function saveRefUrl() {
    setRefSaving(true); setRefSaveErr(null);
    try { await putField({ referenceImageUrl: refUrlDraft.trim() || null }); setRefUploadPreview(''); }
    catch (e) { setRefSaveErr(e instanceof Error ? e.message : 'Save failed'); }
    finally { setRefSaving(false); }
  }

  async function handleRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefUploading(true); setRefUploadErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'prana_reference_images');
      const res = await fetch('https://api.cloudinary.com/v1_1/bn8rjdho/image/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json() as { secure_url: string };
      await putField({ referenceImageUrl: data.secure_url });
      setRefUploadPreview(data.secure_url);
      setRefUrlDraft(data.secure_url);
    } catch {
      setRefUploadErr('Upload failed, please try again');
    } finally {
      setRefUploading(false);
    }
  }

  async function saveRename(versionNumber: number) {
    setRenaming(true); setRenameErr(null);
    try {
      await putVersionField(versionNumber, { name: renameDraft.trim() || null });
      setRenameTabNum(null);
    } catch (e) {
      setRenameErr(e instanceof Error ? e.message : 'Rename failed');
    } finally {
      setRenaming(false);
    }
  }

async function submitVersion(draft: VersionDraft) {
    const payload = {
      name: draft.name.trim() || null,
      size: draft.size || undefined,
      goldWeights: {
        nineKt:     draft.goldWeightNine     ? parseFloat(draft.goldWeightNine)     : undefined,
        fourteenKt: draft.goldWeightFourteen ? parseFloat(draft.goldWeightFourteen) : undefined,
        eighteenKt: draft.goldWeightEighteen ? parseFloat(draft.goldWeightEighteen) : undefined,
      },
      rhodiumInstruction:     draft.rhodiumInstruction || undefined,
      remarks:                draft.remarks || undefined,
      stoneLines:             draft.stoneLines.map(fromLocalLine),
    };
    const res = await fetch(`/api/products/${id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(e.message ?? 'Failed to create version');
    }
    const updated: Product = await res.json();
    setProduct(updated);
    const newVNum = Math.max(...updated.versions.map(v => v.versionNumber));
    setActiveTab(newVNum);
    setVersionDrawerOpen(false);
  }

  if (loading) {
    return (
      <div className="p-8 space-y-5 max-w-6xl animate-pulse">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 bg-[#f0ebe3] rounded" />
          <div className="h-8 w-52 bg-[#f0ebe3] rounded-lg" />
          <div className="h-6 w-28 bg-[#f0ebe3] rounded-full" />
        </div>
        {/* Tab bar */}
        <div className="flex gap-1">
          <div className="h-8 w-10 bg-[#f0ebe3] rounded-lg" />
          <div className="h-8 w-28 bg-[#f0ebe3] rounded-lg" />
        </div>
        {/* Two-column body */}
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="lg:w-[40%] h-96 bg-[#f0ebe3] rounded-xl" />
          <div className="lg:w-[60%] bg-white rounded-xl border border-[#e8e0d4] p-5 space-y-0">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f8f5f0]">
                <div className="h-3 w-32 bg-[#f0ebe3] rounded shrink-0" />
                <div className="h-3 flex-1 bg-[#f0ebe3] rounded" />
              </div>
            ))}
          </div>
        </div>
        {/* Stone lines */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6 space-y-3">
          <div className="h-4 w-24 bg-[#f0ebe3] rounded" />
          <div className="h-28 bg-[#f0ebe3] rounded-lg" />
        </div>
      </div>
    );
  }

  if (fetchErr || !product) {
    return (
      <div className="p-8">
        <p className="text-red-600 text-sm mb-3">{fetchErr ?? 'Product not found'}</p>
        <Link href="/products" className="text-sm text-brand hover:underline">← Back to Products</Link>
      </div>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const sortedVersions = [...product.versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const activeVersion  = sortedVersions.find(v => v.versionNumber === activeTab) ?? null;
  const isV1           = activeTab === 1;
  const slot: Product | ProductVersion = activeVersion ?? product;

  function slotSave(body: Record<string, unknown>): Promise<Product> {
    return isV1 ? putField(body) : putVersionField(activeTab, body);
  }

  function buildVersionDraft(): VersionDraft {
    return {
      name:               (activeVersion as ProductVersion | null)?.name ?? '',
      size:               slot.size ?? '',
      goldWeightNine:     slot.goldWeights?.nineKt     != null ? String(slot.goldWeights.nineKt)     : '',
      goldWeightFourteen: slot.goldWeights?.fourteenKt  != null ? String(slot.goldWeights.fourteenKt)  : '',
      goldWeightEighteen: slot.goldWeights?.eighteenKt  != null ? String(slot.goldWeights.eighteenKt)  : '',
      rhodiumInstruction: slot.rhodiumInstruction ?? '',
      remarks:            slot.remarks ?? '',
      stoneLines:         (slot.stoneLines ?? []).map(toLocalLine),
    };
  }

  const embed   = gdEmbed(product.cadImageUrl);
  const showImg = !!embed && !imgFailed;

  return (
    <>
    <div className="p-8 space-y-5 max-w-6xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/products"
          className="flex items-center gap-1 text-sm text-[#6b6560] hover:text-[#1a1a1a] transition-colors shrink-0">
          <ChevronLeft /> Products
        </Link>

        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">{product.designNumber}</h1>
          {product.queueCode && (
            <span className="text-sm font-mono text-[#6b6560]/60">{product.queueCode}</span>
          )}
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[product.status] ?? 'bg-[#f0ebe3] text-[#6b6560]'}`}>
            {product.status}
          </span>
        </div>

      </div>

      {/* ── Version tab bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setActiveTab(1)}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isV1 ? 'bg-brand text-white shadow-sm' : 'text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#f0ebe3]'
          }`}
        >
          V1
        </button>

        {sortedVersions.map(v => {
          const label    = v.name || `V${v.versionNumber}`;
          const isActive = activeTab === v.versionNumber;
          const isRenaming = renameTabNum === v.versionNumber;

          if (isRenaming) {
            return (
              <div key={v.versionNumber} className="relative">
                <div className="flex items-center rounded-lg border border-brand/30 bg-white text-sm overflow-hidden shadow-sm">
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  saveRename(v.versionNumber);
                      if (e.key === 'Escape') { setRenameTabNum(null); setRenameErr(null); }
                    }}
                    placeholder={`V${v.versionNumber}`}
                    className="px-2.5 py-1.5 w-36 focus:outline-none text-[#1a1a1a] bg-transparent"
                  />
                  <button
                    onClick={() => saveRename(v.versionNumber)}
                    disabled={renaming}
                    className="px-2 py-1.5 text-brand border-l border-brand/20 hover:bg-brand/5 disabled:opacity-50 transition-colors"
                  >
                    {renaming ? <Spinner /> : <CheckIcon />}
                  </button>
                  <button
                    onClick={() => { setRenameTabNum(null); setRenameErr(null); }}
                    className="px-2 py-1.5 text-[#6b6560] border-l border-[#f0ebe3] hover:bg-[#f8f5f0] transition-colors"
                  >
                    <XSmall />
                  </button>
                </div>
                {renameErr && (
                  <p className="absolute top-full left-0 mt-0.5 text-[11px] text-red-500 bg-white border border-red-100 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm z-10">
                    {renameErr}
                  </p>
                )}
              </div>
            );
          }

          return (
            <button
              key={v.versionNumber}
              onClick={() => setActiveTab(v.versionNumber)}
              className={`group flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand text-white shadow-sm' : 'text-[#6b6560] hover:text-[#1a1a1a] hover:bg-[#f0ebe3]'
              }`}
            >
              {label}
              <span
                role="button"
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation();
                  setRenameTabNum(v.versionNumber);
                  setRenameDraft(v.name ?? '');
                  setRenameErr(null);
                }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setRenameTabNum(v.versionNumber); setRenameDraft(v.name ?? ''); setRenameErr(null); } }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 -mr-1 ${
                  isActive ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-[#6b6560]/60 hover:text-brand hover:bg-[#e8e0d4]'
                }`}
              >
                <PencilTiny />
              </span>
            </button>
          );
        })}

        {sortedVersions.length > 0 && <span className="w-px h-5 bg-[#e8e0d4] mx-0.5" />}

        <button
          onClick={() => { setVersionDraftInitial(buildVersionDraft()); setVersionDrawerOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand border border-dashed border-brand/40 rounded-lg hover:bg-brand/5 transition-colors"
        >
          <PlusIcon /> Add Version
        </button>
      </div>

      {/* ── Two-column body ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left — CAD image (product-level, always V1) */}
        <div className="lg:w-[40%] bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#1a1a1a]">CAD Image</h2>

          <div className="rounded-xl overflow-hidden bg-[#f0ebe3] aspect-square flex items-center justify-center">
            {showImg ? (
              <img src={embed!} alt={product.designNumber} referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-brand/20">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9L19 8H5l2.5-4zM12 17.5L5 9h14l-7 8.5z" />
                </svg>
                <span className="text-brand/30 text-xs font-bold tracking-widest uppercase">{product.designNumber}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#6b6560]">Google Drive URL</label>
            <textarea
              value={cadDraft}
              onChange={e => setCadDraft(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[#ddd5c8] px-3 py-2 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none placeholder-[#6b6560]/40"
              placeholder="https://drive.google.com/file/d/…/view"
            />
            <p className="text-[10px] text-[#6b6560]/60">File must be shared as &ldquo;Anyone with the link&rdquo;</p>
            {cadErr && <p className="text-xs text-red-500">{cadErr}</p>}
            <button onClick={saveCad} disabled={cadSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 transition-colors">
              {cadSaving ? <Spinner /> : null}
              Save Image URL
            </button>
          </div>

          {/* Reference Image */}
          <div className="pt-4 border-t border-[#f0ebe3] space-y-3">
            {product.referenceImageUrl && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6b6560]">Reference Image</label>
                <img src={product.referenceImageUrl} alt="Reference"
                  className="max-h-64 w-full rounded-xl object-contain border border-[#f0ebe3]" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#6b6560]">
                  {product.referenceImageUrl ? 'Update Reference Image' : 'Reference Image'}
                </label>
                <div className="flex rounded-md overflow-hidden border border-[#ddd5c8] text-[11px]">
                  <button type="button"
                    onClick={() => setRefImgMode('url')}
                    className={`px-2 py-0.5 transition-colors ${refImgMode === 'url' ? 'bg-[#f0ebe3] text-[#1a1a1a] font-medium' : 'text-[#6b6560] hover:bg-[#f8f5f0]'}`}>
                    Paste URL
                  </button>
                  <button type="button"
                    onClick={() => setRefImgMode('upload')}
                    className={`px-2 py-0.5 transition-colors border-l border-[#ddd5c8] ${refImgMode === 'upload' ? 'bg-[#f0ebe3] text-[#1a1a1a] font-medium' : 'text-[#6b6560] hover:bg-[#f8f5f0]'}`}>
                    Upload File
                  </button>
                </div>
              </div>
              {refImgMode === 'url' ? (
                <>
                  <textarea
                    value={refUrlDraft}
                    onChange={e => setRefUrlDraft(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-[#ddd5c8] px-3 py-2 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none placeholder-[#6b6560]/40"
                    placeholder="https://... or Cloudinary URL"
                  />
                  {refSaveErr && <p className="text-xs text-red-500">{refSaveErr}</p>}
                  <button onClick={saveRefUrl} disabled={refSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 transition-colors">
                    {refSaving ? <Spinner /> : null}
                    Save Reference Image
                  </button>
                </>
              ) : refUploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[#6b6560] border-2 border-dashed border-[#ddd5c8] rounded-lg p-4">
                  <Spinner />
                  Uploading...
                </div>
              ) : refUploadPreview ? (
                <div className="relative inline-block">
                  <img src={refUploadPreview} alt="Reference" className="w-20 h-20 object-cover rounded-lg border border-[#ddd5c8]" />
                  <button type="button"
                    onClick={() => setRefUploadPreview('')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-[#ddd5c8] rounded-full text-[#6b6560] flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-xs font-bold shadow-sm">
                    ×
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="sr-only" onChange={handleRefUpload} />
                  <div className="border-2 border-dashed border-[#ddd5c8] rounded-lg p-4 text-center hover:border-brand/40 transition-colors">
                    <span className="text-sm text-[#6b6560]">Click to upload or drag and drop</span>
                  </div>
                </label>
              )}
              {refUploadErr && <p className="text-xs text-red-500">{refUploadErr}</p>}
            </div>
          </div>
        </div>

        {/* Right — Product / Version info */}
        <div className="lg:w-[60%] bg-white rounded-xl border border-[#e8e0d4] shadow-[0_2px_12px_rgba(26,26,26,0.06)] p-5">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">
              {isV1 ? 'Product Info' : `Version ${activeTab}`}
            </h2>
            {!isV1 && activeVersion && (
              <span className="text-[11px] text-[#6b6560]/60">
                Created {fmtDate(activeVersion.createdAt)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#6b6560]/60 mb-4">Click any value to edit it inline.</p>

          <div className="divide-y divide-[#f8f5f0]">
            {/* Product-level fields — V1 only */}
            {isV1 && (
              <CategoryField category={product.category}
                onSave={async cat => { await putField({ category: cat || undefined, style: null }); }} />
            )}
            {isV1 && (
              <StyleField style={product.style} category={product.category}
                onSave={async style => { await putField({ style: style || undefined }); }} />
            )}

            {/* Version-level fields — all tabs */}
            <SizeField size={slot.size} category={product.category} onSave={v => slotSave({ size: v }).then(() => {})} />

            <GoldWeightsField value={slot.goldWeights} onSave={v => slotSave({ goldWeights: v }).then(() => {})} />

            <Field label="Rhodium Instruction"
              display={slot.rhodiumInstruction || '—'}
              editValue={slot.rhodiumInstruction ?? ''}
              onSave={v => slotSave({ rhodiumInstruction: v || undefined }).then(() => {})} />

            {/* Status — V1 only */}
            {isV1 && (
              <SelectField label="Status" display={product.status} value={product.status}
                options={STATUSES.map(s => ({ value: s, label: s }))}
                onSave={v => putField({ status: v }).then(() => {})} />
            )}

            <Field label="Remarks"
              display={slot.remarks || '—'}
              editValue={slot.remarks ?? ''}
              onSave={v => slotSave({ remarks: v || undefined }).then(() => {})} />
          </div>
        </div>
      </div>

      {/* ── Stone Lines (tab-aware) ────────────────────────────────────────── */}
      <StoneLines
        key={activeTab}
        initial={slot.stoneLines ?? []}
        onSave={async lines => {
          if (isV1) await putField({ stoneLines: lines });
          else await putVersionField(activeTab, { stoneLines: lines });
        }}
      />

      {/* ── Change Log ────────────────────────────────────────────────────── */}
      <ChangeLog entries={product.changelog ?? []} />

    </div>

    <AddVersionDrawer
      open={versionDrawerOpen}
      initialDraft={versionDraftInitial}
      category={product.category}
      onClose={() => setVersionDrawerOpen(false)}
      onSubmit={submitVersion}
    />
    </>
  );
}
