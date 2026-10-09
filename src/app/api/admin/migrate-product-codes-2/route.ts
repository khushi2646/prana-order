import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

const CATEGORY_CODE_MAP: Record<string, string> = {
  Ring:                'RNG',
  Earrings:            'ERG',
  Pendant:             'PDT',
  'Pendant Earrings':  'PDE',
  'Pendant Set':       'PDE',
  Necklace:            'NCK',
  'Necklace Earrings': 'NKE',
  Bracelet:            'BRC',
  'Chain Pendant':     'CHP',
};

export async function GET() {
  try {
    await connectDB();

    const candidates = await Product.find({
      $or: [{ categoryCode: null }, { categoryCode: '' }, { categoryCode: { $exists: false } }],
    });

    let fixed = 0;
    let skipped = 0;

    for (const product of candidates) {
      const code = product.category ? CATEGORY_CODE_MAP[product.category] : undefined;
      if (!code) {
        skipped++;
        continue;
      }

      product.categoryCode = code;
      if (!product.designNumber.startsWith(`${code}-`)) {
        product.designNumber = `${code}-${product.designNumber}`;
      }
      product.queueCode = `${product.designNumber}-${code}`;

      await product.save();
      fixed++;
    }

    return NextResponse.json({ fixed, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
