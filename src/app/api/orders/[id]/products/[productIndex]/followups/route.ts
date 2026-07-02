import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

type Ctx = { params: Promise<{ id: string; productIndex: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id, productIndex } = await params;
    const idx = parseInt(productIndex, 10);

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (isNaN(idx) || idx < 0 || idx >= order.products.length) {
      return NextResponse.json({ message: 'Invalid product index' }, { status: 400 });
    }

    const product = order.products[idx] as unknown as { vendorFollowUps: Array<{ date: Date; notes: string }> };
    if (!product.vendorFollowUps) product.vendorFollowUps = [];

    if (product.vendorFollowUps.length >= 5) {
      return NextResponse.json({ message: 'Maximum 5 follow-ups allowed per vendor product' }, { status: 400 });
    }

    const body = await request.json() as { notes?: string };
    if (!body.notes?.trim()) {
      return NextResponse.json({ message: 'Notes are required' }, { status: 400 });
    }

    product.vendorFollowUps.push({ date: new Date(), notes: body.notes.trim() });
    (order as unknown as { updatedAt: Date }).updatedAt = new Date();
    order.markModified('products');
    await order.save();

    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
