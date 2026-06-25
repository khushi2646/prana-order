import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/orders/[id] ──────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── PATCH /api/orders/[id] ────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const body = await request.json() as Record<string, unknown>;

    // orderId is immutable
    delete body.orderId;

    const updates = { ...body, updatedAt: new Date() };

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}

// ── DELETE /api/orders/[id] ───────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;
    await Order.findByIdAndDelete(id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
