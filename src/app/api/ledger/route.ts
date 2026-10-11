import { NextRequest, NextResponse } from 'next/server';
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

interface LedgerDoc {
  _id: string;
  entries?: LedgerEntry[];
  sizes?: string[];
  shapes?: string[];
  colours?: string[];
}

async function getLedgerDoc(dlConn: mongoose.Connection) {
  const doc = await dlConn.collection<LedgerDoc>('data').findOne({ _id: 'ledger' });
  return doc;
}

// ── GET /api/ledger ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const dlConn = await connectDiamondLedger();
    const doc = await getLedgerDoc(dlConn);

    return NextResponse.json({
      entries: doc?.entries ?? [],
      sizes:   doc?.sizes   ?? [],
      shapes:  doc?.shapes  ?? [],
      colours: doc?.colours ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── POST /api/ledger ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body.entry as LedgerEntry | undefined;

    if (!entry || !entry.type || !entry.shape || entry.pieces == null || entry.carats == null || !entry.date) {
      return NextResponse.json({ message: 'type, shape, pieces, carats and date are required' }, { status: 400 });
    }

    const dlConn = await connectDiamondLedger();
    await dlConn.collection<LedgerDoc>('data').updateOne(
      { _id: 'ledger' },
      { $push: { entries: entry } },
      { upsert: true },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
