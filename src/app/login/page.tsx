'use client';

import { useState, FormEvent } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setError(data.message ?? 'Incorrect password');
        return;
      }
      window.location.href = '/products';
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(69,97,88,0.12)] p-10 w-full max-w-sm flex flex-col items-center gap-7">

        {/* Brand */}
        <img src="/prana_logo_dark.png" alt="Prana Order" style={{ width: '160px' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-[#6b6560] uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#ddd5c8] bg-white text-[#1a1a1a] placeholder-[#bbb4ae] text-sm focus:outline-none focus:ring-2 focus:ring-[#456158] focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#456158] hover:bg-[#3a5049] active:bg-[#2f4039] text-[#f8f5f0] text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Checking…' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
