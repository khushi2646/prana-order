import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { connectDiamondLedger } from '@/lib/mongodb';
import Product from '@/models/Product';

type Ctx = { params: Promise<{ productId: string }> };

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseL(sizeStr: string | undefined): number | null {
  if (!sizeStr) return null;
  const s    = sizeStr.toString().toUpperCase();
  const xIdx = s.indexOf('X');
  const l    = parseFloat(xIdx !== -1 ? s.slice(0, xIdx) : s);
  return Number.isFinite(l) ? l : null;
}

interface LedgerEntry {
  shape?:  string;
  size?:   string;
  colour?: string;
  type?:   string;
  pieces?: number;
}

interface StockGroup {
  shape:  string;
  size:   string;
  colour: string;
  net:    number;
}

function buildStockMap(entries: LedgerEntry[]): StockGroup[] {
  const map: Record<string, StockGroup> = {};
  for (const e of entries) {
    const key = `${(e.shape  || '').toUpperCase()}|||${(e.size   || '').toUpperCase()}|||${(e.colour || 'WHITE').toUpperCase()}`;
    if (!map[key]) {
      map[key] = {
        shape:  (e.shape  || '').toUpperCase(),
        size:   (e.size   || '').toUpperCase(),
        colour: (e.colour || 'WHITE').toUpperCase(),
        net: 0,
      };
    }
    map[key].net += e.type === 'IN' ? (e.pieces || 0) : e.type === 'OUT' ? -(e.pieces || 0) : 0;
  }
  return Object.values(map);
}

function getSubstitutes(
  stockGroups: StockGroup[],
  shape: string,
  size: string,
  colour: string,
): { sizeStr: string; availableStock: number }[] {
  const S   = shape.toUpperCase();
  const SZ  = size.toUpperCase();
  const COL = (colour || 'WHITE').toUpperCase();

  return stockGroups
    .filter(g => g.shape === S && g.colour === COL && g.size !== SZ && g.net > 0)
    .map(g => ({ sizeStr: g.size, availableStock: g.net }))
    .sort((a, b) => (parseL(a.sizeStr) ?? 0) - (parseL(b.sizeStr) ?? 0));
}

// ── GET /api/stock-check/[productId] ─────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { productId } = await params;

    const product = await Product.findById(productId).select('stoneLines');
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    const dlConn = await connectDiamondLedger();

    interface LedgerDoc { _id: string; entries?: LedgerEntry[] }
    const ledgerDoc = await dlConn.collection<LedgerDoc>('data').findOne({ _id: 'ledger' });
    if (!ledgerDoc) return NextResponse.json({ message: 'Ledger document not found' }, { status: 503 });

    const entries: LedgerEntry[] = ledgerDoc.entries || [];
    const stockGroups = buildStockMap(entries);

    const results = product.stoneLines
      .filter(line => line.shape)
      .map(line => {
        const shape  = (line.shape  || '').toUpperCase();
        const size   = (line.size   || '').toUpperCase();
        const colour = (line.colour || 'WHITE').toUpperCase();

        const matched = entries.filter(e =>
          e.shape &&
          e.shape.toUpperCase()               === shape  &&
          (e.size   || '').toUpperCase()      === size   &&
          (e.colour || 'WHITE').toUpperCase() === colour
        );

        const inPcs          = matched.filter(e => e.type === 'IN' ).reduce((s, e) => s + (e.pieces || 0), 0);
        const outPcs         = matched.filter(e => e.type === 'OUT').reduce((s, e) => s + (e.pieces || 0), 0);
        const availableStock = inPcs - outPcs;
        const shortfall      = Math.max(0, (line.count || 0) - availableStock);

        return {
          shape,
          size,
          colour,
          requiredPieces:  line.count       || 0,
          requiredWeight:  line.totalWeight || 0,
          availableStock,
          shortfall,
          substitutes: shortfall > 0 ? getSubstitutes(stockGroups, shape, size, colour) : [],
        };
      });

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
