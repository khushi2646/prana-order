'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function GemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2l-4 6 10 14L22 8l-4-6H6zm1.5 2h9l2.5 4H5L6.5 4zm5.5 13.5L4.5 9h15L12 17.5z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14L4 17m8 4V11" />
    </svg>
  );
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

const NAV = [
  { href: '/products',    label: 'Products',    Icon: CubeIcon },
    { href: '/stock-check', label: 'Stock Check', Icon: ClipboardCheckIcon },
  { href: '/gauge',       label: 'Gauge',       Icon: ChartBarIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-[#1a1a1a] flex flex-col h-full min-h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.07] flex justify-center">
        <img src="/prana_logo.png" alt="Prana Order" width={140} className="object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 pt-2 pb-1.5 text-[9px] font-bold tracking-[0.18em] uppercase text-[#f5f0e8]/25">Menu</p>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand text-[#f5f0e8] shadow-sm'
                  : 'text-[#f5f0e8]/55 hover:text-[#f5f0e8] hover:bg-white/[0.08]'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.07]">
        <p className="text-[#f5f0e8]/20 text-[11px]">Prana Order &copy; 2026</p>
      </div>
    </aside>
  );
}
