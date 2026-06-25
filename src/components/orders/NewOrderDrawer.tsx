'use client';

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  customerName: string;
  phoneNumber:  string;
  orderType:    'stock' | 'customer' | '';
  isUrgent:     boolean;
  goldRateFixed: boolean;
  fixedRate:    string;
  targetBudget: string;
  deliveryDate: string;
  remarks:      string;
}

const EMPTY: FormState = {
  customerName:  '',
  phoneNumber:   '',
  orderType:     '',
  isUrgent:      false,
  goldRateFixed: false,
  fixedRate:     '',
  targetBudget:  '',
  deliveryDate:  '',
  remarks:       '',
};

// ── Shared input class ────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-[#ddd5c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456158]/20 focus:border-[#456158] transition-colors placeholder-[#6b6560]/50 text-[#1a1a1a]';

// ── Toggle button pair ────────────────────────────────────────────────────────

function Toggle({ options, value, onChange }: {
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
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            value === o.value
              ? 'bg-[#456158] text-white'
              : 'bg-white text-[#6b6560] hover:bg-[#f0ebe3]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewOrderDrawer({ open, onClose, onSuccess }: Props) {
  const [form, setForm]   = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleClose() {
    setForm(EMPTY);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.customerName.trim()) { setError('Customer name is required.'); return; }
    if (!form.orderType)           { setError('Order type is required.'); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        customerName: form.customerName.trim(),
        orderType:    form.orderType,
        isUrgent:     form.isUrgent,
        goldRate: {
          isFixed:   form.goldRateFixed,
          ...(form.goldRateFixed && form.fixedRate ? { fixedRate: parseFloat(form.fixedRate) } : {}),
        },
      };
      if (form.phoneNumber.trim())  body.phoneNumber  = form.phoneNumber.trim();
      if (form.targetBudget)        body.targetBudget = parseFloat(form.targetBudget);
      if (form.deliveryDate)        body.deliveryDate = form.deliveryDate;
      if (form.remarks.trim())      body.remarks      = form.remarks.trim();

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create order');

      setForm(EMPTY);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8e0d4]">
          <h2 className="font-playfair text-xl font-semibold text-[#1a1a1a]">New Order</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0ebe3] text-[#6b6560] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Customer Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inp}
              type="text"
              placeholder="Full name"
              value={form.customerName}
              onChange={e => set('customerName', e.target.value)}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Phone Number</label>
            <input
              className={inp}
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value)}
            />
          </div>

          {/* Order Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">
              Order Type <span className="text-red-500">*</span>
            </label>
            <Toggle
              options={[{ label: 'Stock', value: 'stock' }, { label: 'Customer', value: 'customer' }]}
              value={form.orderType}
              onChange={v => set('orderType', v as 'stock' | 'customer')}
            />
          </div>

          {/* Is Urgent */}
          <div className="flex items-center gap-3">
            <input
              id="urgent"
              type="checkbox"
              checked={form.isUrgent}
              onChange={e => set('isUrgent', e.target.checked)}
              className="w-4 h-4 rounded border-[#ddd5c8] accent-[#456158]"
            />
            <label htmlFor="urgent" className="text-sm text-[#1a1a1a] select-none cursor-pointer">
              Mark as Urgent
            </label>
          </div>

          {/* Gold Rate */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Gold Rate</label>
            <Toggle
              options={[{ label: 'Not Fixed', value: 'false' }, { label: 'Fixed', value: 'true' }]}
              value={form.goldRateFixed ? 'true' : 'false'}
              onChange={v => set('goldRateFixed', v === 'true')}
            />
            {form.goldRateFixed && (
              <input
                className={inp}
                type="number"
                min={0}
                step={0.01}
                placeholder="Rate per gram (₹)"
                value={form.fixedRate}
                onChange={e => set('fixedRate', e.target.value)}
              />
            )}
          </div>

          {/* Target Budget */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Target Budget (₹)</label>
            <input
              className={inp}
              type="number"
              min={0}
              placeholder="e.g. 50000"
              value={form.targetBudget}
              onChange={e => set('targetBudget', e.target.value)}
            />
          </div>

          {/* Delivery Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Delivery Date</label>
            <input
              className={inp}
              type="date"
              value={form.deliveryDate}
              onChange={e => set('deliveryDate', e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#6b6560] uppercase tracking-wider">Remarks</label>
            <textarea
              className={`${inp} resize-none`}
              rows={3}
              placeholder="Any special instructions…"
              value={form.remarks}
              onChange={e => set('remarks', e.target.value)}
            />
          </div>

          {/* Inline error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e0d4]">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 bg-[#456158] text-white text-sm font-semibold rounded-lg hover:bg-[#3a5049] active:bg-[#304340] transition-colors disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </div>
    </>
  );
}
