'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/types';
import { api, formatPrice } from '@/lib/api';

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600">
        Out of stock
      </span>
    );
  if (stock < 10)
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-600">
        Low — {stock}
      </span>
    );
  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
      {stock}
    </span>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

interface Props {
  products: Product[];
  onDeleted: (id: string) => void;
}

export default function ProductTable({ products, onDeleted }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.products.delete(id);
      onDeleted(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
        <p className="text-gray-400 text-sm">No products match your filters.</p>
        <Link
          href="/products/new"
          className="mt-3 inline-block text-sm text-brand font-medium hover:underline"
        >
          Add a product
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Material</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Stock</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p) => (
              <tr
                key={p._id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/products/${p._id}`)}
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand text-sm font-bold">{p.name[0]}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand">
                    {p.category}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-gray-500">{p.material ?? '—'}</td>
                <td className="px-6 py-3.5 font-medium text-gray-900">{formatPrice(p.price)}</td>
                <td className="px-6 py-3.5">
                  <StockBadge stock={p.stock} />
                </td>
                <td className="px-6 py-3.5">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/products/${p._id}/edit`}
                      className="p-2 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
                      title="Edit"
                    >
                      <EditIcon />
                    </Link>
                    <button
                      onClick={() => handleDelete(p._id, p.name)}
                      disabled={deletingId === p._id}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === p._id ? (
                        <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <TrashIcon />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
