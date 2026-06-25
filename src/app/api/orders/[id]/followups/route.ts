import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

type Ctx = { params: Promise<{ id: string }> };

// ── POST /api/orders/[id]/followups ───────────────────────────────────────────

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (order.followUps.length >= 3) {
      return NextResponse.json(
        { message: 'Maximum 3 follow-ups allowed per order' },
        { status: 400 },
      );
    }

    const body = await request.json() as { notes?: unknown };
    if (!body.notes) {
      return NextResponse.json({ message: 'notes is required' }, { status: 400 });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        $push: { followUps: { date: new Date(), notes: body.notes } },
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
