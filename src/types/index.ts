export const CATEGORIES = [
  'Ring',
  'Necklace',
  'Bracelet',
  'Earring',
  'Pendant',
  'Brooch',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Product {
  _id: string;
  name: string;
  sku: string;
  category: Category;
  price: number;
  stock: number;
  description?: string;
  material?: string;
  weight?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface Stats {
  total: number;
  categories: number;
  lowStock: number;
  inventoryValue: number;
}

export interface ProductFormData {
  name: string;
  sku: string;
  category: Category;
  price: string;
  stock: string;
  description: string;
  material: string;
  weight: string;
  imageUrl: string;
}
