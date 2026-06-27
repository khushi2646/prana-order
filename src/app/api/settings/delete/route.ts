import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import DiamondGauge from '@/models/DiamondGauge';

const ALLOWED = ['orders', 'products', 'diamond_gauge'] as const;
type Collection = typeof ALLOWED[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { collection?: string };
    const collection = body.collection as Collection;

    if (!ALLOWED.includes(collection)) {
      return NextResponse.json(
        { message: `Invalid collection. Must be one of: ${ALLOWED.join(', ')}` },
        { status: 400 },
      );
    }

    await connectDB();

    let result: { deletedCount?: number };

    if (collection === 'orders') {
      result = await Order.deleteMany({});
    } else if (collection === 'products') {
      result = await Product.deleteMany({});
    } else {
      result = await DiamondGauge.deleteMany({});
    }

    return NextResponse.json({ success: true, deleted: result.deletedCount ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
