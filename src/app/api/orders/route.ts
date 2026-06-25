import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

// ── GET /api/orders ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── POST /api/orders ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    if (!body.orderType || !body.customerName) {
      return NextResponse.json(
        { message: 'orderType and customerName are required' },
        { status: 400 },
      );
    }

    const count    = await Order.countDocuments();
    const orderId  = `ORD-${String(count + 1).padStart(3, '0')}`;

    const order = await Order.create({ ...body, orderId });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
