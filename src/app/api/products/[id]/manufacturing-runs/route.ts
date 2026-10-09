import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

type Ctx = { params: Promise<{ id: string }> };

// ── POST /api/products/[id]/manufacturing-runs ────────────────────────────────

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    const body = await request.json() as { orderId?: string; orderMongoId?: string; productCode?: string };

    const runNumber = (product.manufacturingRuns?.length ?? 0) + 1;
    product.manufacturingRuns = product.manufacturingRuns ?? [];
    product.manufacturingRuns.push({
      runNumber,
      orderId:      body.orderId,
      orderMongoId: body.orderMongoId,
      productCode:  body.productCode,
    });

    product.markModified('manufacturingRuns');
    const updated = await product.save();

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
