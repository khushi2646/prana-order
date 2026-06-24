import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DiamondGauge from '@/models/DiamondGauge';

// ── GET /api/gauge/lookup?shape=ROUND&L=1.30&W= ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const shape = (searchParams.get('shape') || '').toUpperCase();
    const L     = parseFloat(searchParams.get('L') ?? '');
    const W     = parseFloat(searchParams.get('W') ?? '');
    const hasW  = Number.isFinite(W);

    if (!shape || !Number.isFinite(L)) {
      return NextResponse.json({ message: 'shape and L are required' }, { status: 400 });
    }

    if (shape === 'ROUND') {
      const sizeStr = L.toFixed(2);
      const exact   = await DiamondGauge.findOne({ type: 'ROUND', sizeStr });
      if (exact) {
        return NextResponse.json({ shape, sizeStr, caratPerStone: exact.caratPerStone, avgRatePerCt: exact.avgRatePerCt, isExact: true, matchedSizeStr: sizeStr });
      }
      const all     = await DiamondGauge.find({ type: 'ROUND' });
      const nearest = all.reduce<{ d: number; e: (typeof all)[0] | null }>(
        (best, e) => { const d = Math.abs(e.L - L); return d < best.d ? { d, e } : best; },
        { d: Infinity, e: null },
      ).e;
      if (!nearest) return NextResponse.json({ message: 'No round gauge entries found' }, { status: 404 });
      return NextResponse.json({ shape, sizeStr, caratPerStone: nearest.caratPerStone, avgRatePerCt: nearest.avgRatePerCt, isExact: false, matchedSizeStr: nearest.sizeStr });
    }

    // FANCY
    const sizeStr = hasW ? `${L.toFixed(2)}X${W.toFixed(2)}` : L.toFixed(2);
    const exact   = await DiamondGauge.findOne({ type: 'FANCY', shape, sizeStr });
    if (exact) {
      return NextResponse.json({ shape, sizeStr, caratPerStone: exact.caratPerStone, avgRatePerCt: exact.avgRatePerCt, isExact: true, matchedSizeStr: sizeStr });
    }
    const all     = await DiamondGauge.find({ type: 'FANCY', shape });
    const area    = hasW ? L * W : L * L;
    const nearest = all.reduce<{ d: number; e: (typeof all)[0] | null }>(
      (best, e) => { const eArea = e.W != null ? e.L * e.W : e.L * e.L; const d = Math.abs(eArea - area); return d < best.d ? { d, e } : best; },
      { d: Infinity, e: null },
    ).e;
    if (!nearest) return NextResponse.json({ message: `No fancy gauge entries found for shape ${shape}` }, { status: 404 });
    return NextResponse.json({ shape, sizeStr, caratPerStone: nearest.caratPerStone, avgRatePerCt: nearest.avgRatePerCt, isExact: false, matchedSizeStr: nearest.sizeStr });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
