import { NextResponse } from 'next/server';
import { connectDiamondLedger } from '@/lib/mongodb';
import mongoose from 'mongoose';

interface LedgerEntry {
  id: number;
  date: string;
  type: 'IN' | 'OUT' | 'CORRECTION';
  shape: string;
  size: string;
  colour: string;
  pieces: number;
  carats: number;
  ref?: string;
  notes?: string;
}

interface StockGroup {
  shape: string;
  size: string;
  colour: string;
  inPcs: number;
  outPcs: number;
  inCt: number;
  outCt: number;
  netPcs: number;
  netCt: number;
}

interface LedgerDoc {
  _id: string;
  entries?: LedgerEntry[];
}

async function getLedgerDoc(dlConn: mongoose.Connection) {
  const doc = await dlConn.collection<LedgerDoc>('data').findOne({ _id: 'ledger' });
  return doc;
}

function buildStockMap(entries: LedgerEntry[]): StockGroup[] {
  const map: Record<string, StockGroup> = {};

  function group(shape: string, size: string, colour: string): StockGroup {
    const key = `${shape}|||${size}|||${colour}`;
    if (!map[key]) {
      map[key] = { shape, size, colour, inPcs: 0, outPcs: 0, inCt: 0, outCt: 0, netPcs: 0, netCt: 0 };
    }
    return map[key];
  }

  for (const e of entries) {
    const shape  = (e.shape  || '').toUpperCase();
    const size   = (e.size   || '').toUpperCase();
    const colour = (e.colour || 'WHITE').toUpperCase();
    const g = group(shape, size, colour);

    const pieces = e.pieces || 0;
    const carats = e.carats || 0;

    if (e.type === 'IN') {
      g.inPcs += pieces;
      g.inCt  += carats;
    } else if (e.type === 'OUT') {
      g.outPcs += pieces;
      g.outCt  += carats;
    } else if (e.type === 'CORRECTION') {
      if (pieces >= 0) g.inPcs += pieces; else g.outPcs += Math.abs(pieces);
      if (carats >= 0) g.inCt  += carats; else g.outCt  += Math.abs(carats);
    }
  }

  return Object.values(map).map(g => ({
    ...g,
    netPcs: g.inPcs - g.outPcs,
    netCt:  g.inCt  - g.outCt,
  }));
}

// ── GET /api/ledger/stock ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const dlConn = await connectDiamondLedger();
    const doc = await getLedgerDoc(dlConn);
    const entries = doc?.entries ?? [];

    const stockGroups = buildStockMap(entries).sort((a, b) =>
      a.shape === b.shape ? a.size.localeCompare(b.size) : a.shape.localeCompare(b.shape),
    );

    return NextResponse.json(stockGroups);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
