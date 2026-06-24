'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/types';
import type { Category, Product, ProductFormData } from '@/types';
import { api } from '@/lib/api';

const EMPTY: ProductFormData = {
  name: '',
  sku: '',
  category: 'Ring',
  price: '',
  stock: '',
  description: '',
  material: '',
  weight: '',
  imageUrl: '',
};

function fromProduct(p: Product): ProductFormData {
  return {
    name: p.name,
    sku: p.sku ?? '',
    category: p.category,
    price: String(p.price),
    stock: String(p.stock),
    description: p.description ?? '',
    material: p.material ?? '',
    weight: p.weight != null ? String(p.weight) : '',
    imageUrl: p.imageUrl ?? '',
  };
}

function toPayload(f: ProductFormData): Partial<Product> {
  return {
    name: f.name.trim(),
    sku: f.sku.trim() || undefined,
    category: f.category,
    price: parseFloat(f.price),
    stock: parseInt(f.stock) || 0,
    description: f.description.trim() || undefined,
    material: f.material.trim() || undefined,
    weight: f.weight ? parseFloat(f.weight) : undefined,
    imageUrl: f.imageUrl.trim() || undefined,
  };
}

interface Props {
  mode: 'create' | 'edit';
  product?: Product;
}

export default function ProductForm({ mode, product }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormData>(
    product ? fromProduct(product) : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof ProductFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setError('A valid price is required.'); return; }
    setError(null);
    setSaving(true);
    try {
      if (mode === 'create') {
        await api.products.create(toPayload(form));
        router.push('/products');
      } else {
        await api.products.update(product!._id, toPayload(form));
        router.push(`/products/${product!._id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';
  const inputCls =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div className="md:col-span-2">
          <label className={labelCls}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            type="text"
            placeholder="e.g. Diamond Solitaire Ring"
            value={form.name}
            onChange={set('name')}
            required
          />
        </div>

        {/* SKU */}
        <div>
          <label className={labelCls}>SKU</label>
          <input
            className={inputCls}
            type="text"
            placeholder="Auto-generated if blank"
            value={form.sku}
            onChange={set('sku')}
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelCls}>
            Category <span className="text-red-500">*</span>
          </label>
          <select className={inputCls} value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className={labelCls}>
            Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            className={inputCls}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={set('price')}
            required
          />
        </div>

        {/* Stock */}
        <div>
          <label className={labelCls}>Stock</label>
          <input
            className={inputCls}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={form.stock}
            onChange={set('stock')}
          />
        </div>

        {/* Material */}
        <div>
          <label className={labelCls}>Material</label>
          <input
            className={inputCls}
            type="text"
            placeholder="e.g. 18K Gold, 925 Silver"
            value={form.material}
            onChange={set('material')}
          />
        </div>

        {/* Weight */}
        <div>
          <label className={labelCls}>Weight (g)</label>
          <input
            className={inputCls}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.weight}
            onChange={set('weight')}
          />
        </div>

        {/* Image URL */}
        <div className="md:col-span-2">
          <label className={labelCls}>Image URL</label>
          <input
            className={inputCls}
            type="url"
            placeholder="https://example.com/image.jpg"
            value={form.imageUrl}
            onChange={set('imageUrl')}
          />
          {form.imageUrl && (
            <div className="mt-2">
              <img
                src={form.imageUrl}
                alt="Preview"
                className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Product details, features, occasion suitability..."
            value={form.description}
            onChange={set('description')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {mode === 'create' ? 'Add Product' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
