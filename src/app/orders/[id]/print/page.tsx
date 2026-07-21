'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderProduct {
  productCode:              string;
  productRef?:              string | null;
  isVendorProduct?:         boolean;
  vendorDescription?:       string;
  vendorDesignCode?:        string | null;
  vendorReferenceImageUrl?: string | null;
  quantity:                 number;
  goldColours?:             string[];
  goldCarat?:               string;
  remarks?:                 string;
}

interface Order {
  _id:       string;
  orderId:   string;
  isUrgent:  boolean;
  products:  OrderProduct[];
}

interface CatalogueEntry {
  rhodiumInstruction?: string;
  cadImageUrl?:        string;
  referenceImageUrl?:  string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gdriveThumbnail(url: string): string {
  const m = url.match(/\/d\/([^/]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

const goldColourBadge: Record<string, string> = {
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  white:  'bg-slate-50  text-slate-700  border-slate-200',
  rose:   'bg-pink-50   text-pink-700   border-pink-200',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-white"><p className="text-[#6b6560]">Loading…</p></div>}>
      <OrderPrintContent params={params} />
    </Suspense>
  );
}

function OrderPrintContent({ params }: { params: Promise<{ id: string }> }) {
  const { id }      = use(params);
  const searchParams = useSearchParams();
  const productsParam = searchParams.get('products');

  const [order, setOrder]     = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [catalogueMap, setCatalogueMap] = useState<Record<string, CatalogueEntry>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error('Failed to load');
        setOrder(await res.json());
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!order) return;
    const refs = order.products
      .map(p => p.productRef)
      .filter((ref): ref is string => !!ref);
    if (!refs.length) { setCatalogueMap({}); return; }
    Promise.all(
      refs.map(ref =>
        fetch(`/api/products/${ref}`, { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<string, CatalogueEntry> = {};
      refs.forEach((ref, i) => {
        if (results[i]) {
          map[ref] = {
            rhodiumInstruction: results[i].rhodiumInstruction ?? '',
            cadImageUrl:        results[i].cadImageUrl ?? '',
            referenceImageUrl:  results[i].referenceImageUrl ?? null,
          };
        }
      });
      setCatalogueMap(map);
    });
  }, [order]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-white"><p className="text-[#6b6560]">Loading…</p></div>;
  }
  if (notFound || !order) {
    return <div className="flex items-center justify-center min-h-screen bg-white"><p className="text-[#6b6560]">Order not found.</p></div>;
  }

  const displayedProducts = productsParam
    ? order.products.filter(p => productsParam.split(',').includes(p.productCode))
    : order.products;

  return (
    <div className="print-page min-h-screen bg-white p-8">
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { font-size: 11pt; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; }
          .print-table, .print-table * { box-shadow: none !important; }
          .print-table { border-collapse: collapse !important; border-radius: 0 !important; }
          .print-table th, .print-table td {
            border: 1px solid #999 !important;
            background: transparent !important;
            border-radius: 0 !important;
          }
          .print-row { page-break-inside: avoid; }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">{order.orderId}</h1>
          {order.isUrgent && (
            <span className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Urgent
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print px-4 py-2 text-sm font-semibold bg-[#456158] text-white rounded-lg hover:bg-[#3a5049] transition-colors"
        >
          Print
        </button>
      </div>

      {/* Table */}
      <table className="print-table rounded-xl border border-[#f0ebe3] w-full text-sm overflow-hidden">
        <thead>
          <tr className="bg-[#1a1a1a] text-white">
            <th className="font-semibold px-4 py-3 text-left">#</th>
            <th className="font-semibold px-4 py-3 text-left">Image</th>
            <th className="font-semibold px-4 py-3 text-left">Product Code</th>
            <th className="font-semibold px-4 py-3 text-left">Gold Colours</th>
            <th className="font-semibold px-4 py-3 text-left">Gold Carat</th>
            <th className="font-semibold px-4 py-3 text-left">Rhodium Instructions</th>
            <th className="font-semibold px-4 py-3 text-left">Remarks</th>
            <th className="font-semibold px-4 py-3 text-left">Urgent</th>
          </tr>
        </thead>
        <tbody>
          {displayedProducts.map((product, i) => {
            const catEntry = product.productRef ? catalogueMap[product.productRef] : undefined;
            const cadImageUrl = catEntry?.cadImageUrl ?? '';
            const refImageUrl = product.isVendorProduct
              ? (product.vendorReferenceImageUrl ?? '')
              : (catEntry?.referenceImageUrl ?? '');
            const imgUrl = cadImageUrl || refImageUrl;

            return (
              <tr key={i} className={`print-row border-t border-[#f0ebe3] ${i % 2 === 1 ? 'bg-[#faf8f5]' : 'bg-white'}`}>
                <td className="px-4 py-4">{i + 1}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center">
                    {imgUrl ? (
                      <img
                        src={gdriveThumbnail(imgUrl)}
                        alt=""
                        className="max-h-32 max-w-32 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-[#f0ebe3] rounded" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold text-[#1a1a1a]">
                    {product.isVendorProduct ? (product.vendorDescription ?? product.productCode) : product.productCode}
                  </div>
                  {product.isVendorProduct && (
                    <span className="inline-block mt-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">Vendor</span>
                  )}
                  {product.vendorDesignCode && (
                    <div className="text-xs text-[#6b6560] mt-1">{product.vendorDesignCode}</div>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(product.goldColours ?? []).map(c => (
                      <span key={c} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${goldColourBadge[c] ?? 'bg-[#f0ebe3] text-[#6b6560] border-[#ddd5c8]'}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 uppercase">{product.goldCarat ?? ''}</td>
                <td className="px-4 py-4">{!product.isVendorProduct ? (catEntry?.rhodiumInstruction ?? '') : ''}</td>
                <td className="px-4 py-4">{product.remarks ?? ''}</td>
                <td className="px-4 py-4">
                  {order.isUrgent && <span className="text-red-600 font-semibold">Yes</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
