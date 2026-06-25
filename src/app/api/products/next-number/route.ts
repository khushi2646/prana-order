import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectDB();

    const products = await Product.find({}, { designNumber: 1, _id: 0 }).lean();

    if (!products.length) {
      return NextResponse.json({ nextNumber: 'P001' });
    }

    const max = products.reduce((best, p) => {
      const n = parseInt((p.designNumber as string).replace(/^P/i, ''), 10);
      return Number.isFinite(n) && n > best ? n : best;
    }, 0);

    const next = String(max + 1).padStart(3, '0');
    return NextResponse.json({ nextNumber: `P${next}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
