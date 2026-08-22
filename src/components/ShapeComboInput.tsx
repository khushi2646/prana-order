'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const BASE_SHAPES = ['ROUND','PEAR','MARQUISE','OVAL','PRINCESS','CUSHION','EMERALD','RADIANT','BAGUETTE','HEART','TRILLION','LOZENGE'];

const inp = 'w-full rounded-lg border border-[#ddd5c8] px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#6b6560]/50 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors';

function mergeShapes(fetched: string[]): string[] {
  const set = new Set([...BASE_SHAPES, ...fetched].map(s => s.toUpperCase()));
  return Array.from(set).sort();
}

interface ShapeComboInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ShapeComboInput({ value, onChange, placeholder }: ShapeComboInputProps) {
  const [shapes, setShapes] = useState<string[]>(BASE_SHAPES);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/settings/shapes');
        if (!res.ok) return;
        const data = await res.json() as { shapes: string[] };
        if (!cancelled) setShapes(mergeShapes(data.shapes ?? []));
      } catch { /* network error — fall back to BASE_SHAPES */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) && !(e.target as Element).closest('[data-shape-dropdown]')) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) setDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  function calcPos() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setDropdownPos({ top: rect.bottom, left: rect.left, width: rect.width });
  }

  const trimmedUpper = value.trim().toUpperCase();
  const matches = shapes.filter(s => s.includes(trimmedUpper));
  const showAdd = trimmedUpper !== '' && !shapes.includes(trimmedUpper);

  function choose(s: string) {
    onChange(s);
    setOpen(false);
  }

  async function addShape() {
    if (!trimmedUpper || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/settings/shapes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shape: trimmedUpper }),
      });
      if (res.ok) {
        const data = await res.json() as { shapes: string[] };
        setShapes(mergeShapes(data.shapes ?? []));
      }
    } catch { /* network error */ }
    finally {
      setAdding(false);
      onChange(trimmedUpper);
      setOpen(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="text" className={inp} value={value} placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { calcPos(); setOpen(true); }}
      />
      {open && dropdownPos && createPortal(
        <div
          data-shape-dropdown="true"
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-lg border border-[#f0ebe3] max-h-48 overflow-y-auto py-1"
        >
          {matches.map(s => (
            <div key={s} onClick={() => choose(s)}
              className="px-3 py-2 text-sm hover:bg-[#f8f5f0] cursor-pointer">
              {s}
            </div>
          ))}
          {showAdd && (
            <div onClick={addShape}
              className="px-3 py-2 text-sm hover:bg-[#f8f5f0] cursor-pointer text-[#456158] font-medium">
              Add &apos;{trimmedUpper}&apos;
            </div>
          )}
          {matches.length === 0 && !showAdd && (
            <div className="px-3 py-2 text-sm text-[#6b6560]">No matches</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
