import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

type Ctx = { params: Promise<{ id: string }> };

// ── POST /api/orders/[id]/products ────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    const body = await request.json() as Record<string, unknown>;

    if (!body.productCode || body.quantity == null) {
      return NextResponse.json(
        { message: 'productCode and quantity are required' },
        { status: 400 },
      );
    }

    const quantity = Number(body.quantity);

    // Recalculate totalPieces for each stone line
    if (Array.isArray(body.stoneLines)) {
      body.stoneLines = (body.stoneLines as Record<string, unknown>[]).map(sl => ({
        ...sl,
        totalPieces:
          sl.piecesPerUnit != null
            ? Number(sl.piecesPerUnit) * quantity
            : sl.totalPieces,
      }));
    }

    const product = { ...body, quantity };

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        $push: { products: product },
        $set:  { updatedAt: new Date() },
      },
      { new: true, runValidators: true },
    ).lean();

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
