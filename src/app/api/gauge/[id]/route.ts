import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DiamondGauge from '@/models/DiamondGauge';

type Ctx = { params: Promise<{ id: string }> };

// ── PUT /api/gauge/[id] ───────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { caratPerStone, avgRatePerCt } = body as { caratPerStone: unknown; avgRatePerCt: unknown };

    if (typeof caratPerStone !== 'number' || !Number.isFinite(caratPerStone) || caratPerStone <= 0) {
      return NextResponse.json({ message: 'caratPerStone must be a positive number' }, { status: 400 });
    }

    const entry = await DiamondGauge.findByIdAndUpdate(
      id,
      { $set: { caratPerStone, avgRatePerCt: avgRatePerCt ?? null } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!entry) return NextResponse.json({ message: 'Gauge entry not found' }, { status: 404 });

    return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
