import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { connectDiamondLedger } from '@/lib/mongodb';
import DiamondGauge from '@/models/DiamondGauge';

// ── Helper ────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  shape?:  string;
  size?:   string;
  colour?: string;
  type?:   string;
  pieces?: number;
}

function ledgerStock(entries: LedgerEntry[], shape: string, sizeStr: string): number {
  const s  = shape.toUpperCase();
  const sz = sizeStr.toUpperCase();
  const matched = entries.filter(e =>
    (e.shape  || '').toUpperCase() === s  &&
    (e.size   || '').toUpperCase() === sz &&
    (e.colour || 'WHITE').toUpperCase() === 'WHITE'
  );
  const inPcs  = matched.filter(e => e.type === 'IN' ).reduce((n, e) => n + (e.pieces || 0), 0);
  const outPcs = matched.filter(e => e.type === 'OUT').reduce((n, e) => n + (e.pieces || 0), 0);
  return inPcs - outPcs;
}

// ── GET /api/gauge/substitutes?shape=ROUND&L=1.30&W=&requiredPcs=20 ──────────

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const shape       = (searchParams.get('shape') || '').toUpperCase();
    const L           = parseFloat(searchParams.get('L') ?? '');
    const W           = parseFloat(searchParams.get('W') ?? '');
    const hasW        = Number.isFinite(W);
    const requiredPcs = parseInt(searchParams.get('requiredPcs') ?? '0', 10) || 0;

    if (!shape || !Number.isFinite(L)) {
      return NextResponse.json({ message: 'shape and L are required' }, { status: 400 });
    }

    // Determine tolerance (or bail with no substitutes)
    let tolerance: number;
    if (shape === 'ROUND') {
      if (L < 3) return NextResponse.json({ substitutes: [] });
      tolerance = L <= 6 ? 0.1 : 0.3;
    } else {
      if (L < 4) return NextResponse.json({ substitutes: [] });
      tolerance = L <= 6 ? 0.1 : 0.3;
    }

    // Fetch candidates from gauge
    const candidates = await DiamondGauge.find(
      shape === 'ROUND'
        ? { type: 'ROUND' as const, L: { $gte: L - tolerance, $lte: L + tolerance } }
        : { type: 'FANCY' as const, shape, L: { $gte: L - tolerance, $lte: L + tolerance } }
    );

    // Load ledger
    interface LedgerDoc { _id: string; entries?: LedgerEntry[] }
    const dlConn    = await connectDiamondLedger();
    const ledgerDoc = await dlConn.collection<LedgerDoc>('data').findOne({ _id: 'ledger' });
    const entries: LedgerEntry[] = ledgerDoc?.entries || [];

    const substitutes = candidates
      .map(c => ({
        sizeStr:        c.sizeStr,
        caratPerStone:  c.caratPerStone,
        availableStock: ledgerStock(entries, c.shape, c.sizeStr),
      }))
      .filter(s => s.availableStock >= requiredPcs);

    return NextResponse.json({ substitutes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
