import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DiamondGauge from '@/models/DiamondGauge';
import { backfillProductsForGauge } from '@/lib/gaugeUtils';

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

// ── POST /api/gauge ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json() as {
      type: unknown; shape: unknown; L: unknown; W: unknown;
      caratPerStone: unknown; avgRatePerCt: unknown;
    };

    const { type, shape: rawShape, L, W, caratPerStone, avgRatePerCt } = body;

    if (type !== 'ROUND' && type !== 'FANCY') {
      return NextResponse.json({ message: 'type must be ROUND or FANCY' }, { status: 400 });
    }
    const Lnum = parseFloat(String(L));
    if (!Number.isFinite(Lnum) || Lnum <= 0) {
      return NextResponse.json({ message: 'L must be a positive number' }, { status: 400 });
    }
    const caratNum = parseFloat(String(caratPerStone));
    if (!Number.isFinite(caratNum) || caratNum <= 0) {
      return NextResponse.json({ message: 'caratPerStone must be a positive number' }, { status: 400 });
    }

    const shape  = type === 'ROUND' ? 'ROUND' : String(rawShape).toUpperCase();
    if (type === 'FANCY' && !shape) {
      return NextResponse.json({ message: 'shape is required for FANCY type' }, { status: 400 });
    }

    const Wnum   = type === 'FANCY' && W != null && String(W) !== '' ? parseFloat(String(W)) : null;
    const sizeStr = type === 'ROUND'
      ? Lnum.toFixed(2)
      : (Wnum != null && Number.isFinite(Wnum)
          ? `${Lnum.toFixed(2)}X${Wnum.toFixed(2)}`
          : Lnum.toFixed(2));

    const rateNum = avgRatePerCt != null && String(avgRatePerCt) !== ''
      ? parseFloat(String(avgRatePerCt))
      : null;

    const entry = await DiamondGauge.create({
      type, shape, sizeStr,
      L: Lnum,
      W: Wnum,
      caratPerStone: caratNum,
      avgRatePerCt: rateNum,
    });

    // Fire-and-forget: update any existing stone lines that match
    backfillProductsForGauge(shape, sizeStr, caratNum).catch(err =>
      console.error('[gauge POST] backfill failed:', err),
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
