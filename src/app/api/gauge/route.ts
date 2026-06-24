import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DiamondGauge from '@/models/DiamondGauge';

// ── GET /api/gauge ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    await connectDB();
    const entries = await DiamondGauge.find().lean();
    return NextResponse.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
