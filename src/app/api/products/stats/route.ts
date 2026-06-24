import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

// ── GET /api/products/stats ───────────────────────────────────────────────────

export async function GET() {
  try {
    await connectDB();

    const [total, byStatus, byCategory] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort:  { _id: 1 } },
      ]),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort:  { _id: 1 } },
      ]),
    ]);

    return NextResponse.json({ total, byStatus, byCategory });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
