import { NextRequest, NextResponse } from 'next/server';
import { connectDiamondLedger } from '@/lib/mongodb';
import mongoose from 'mongoose';

const DEFAULT_SHAPES = ['ROUND', 'PRINCESS', 'PEAR', 'OVAL', 'MARQUISE', 'HEART', 'CUSHION', 'EMERALD', 'TRILLION', 'RADIANT', 'LOZENGE', 'BAGUETTE'];
const DEFAULT_COLOURS = ['WHITE', 'YELLOW', 'PINK', 'BLUE', 'GREEN', 'BROWN', 'BLACK'];
const DEFAULT_SIZES: string[] = [];

interface LedgerDoc {
  _id: string;
  shapes?: string[];
  colours?: string[];
  sizes?: string[];
}

async function getLedgerDoc(dlConn: mongoose.Connection) {
  const doc = await dlConn.collection<LedgerDoc>('data').findOne({ _id: 'ledger' });
  return doc;
}

// ── GET /api/ledger/settings ──────────────────────────────────────────────────

export async function GET() {
  try {
    const dlConn = await connectDiamondLedger();
    const doc = await getLedgerDoc(dlConn);

    return NextResponse.json({
      shapes:  doc?.shapes  ?? DEFAULT_SHAPES,
      colours: doc?.colours ?? DEFAULT_COLOURS,
      sizes:   doc?.sizes   ?? DEFAULT_SIZES,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── POST /api/ledger/settings ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { field, action, value } = await request.json();

    if (!field || !action || !value) {
      return NextResponse.json({ message: 'field, action and value are required' }, { status: 400 });
    }
    if (field !== 'shapes' && field !== 'colours' && field !== 'sizes') {
      return NextResponse.json({ message: 'field must be "shapes", "colours" or "sizes"' }, { status: 400 });
    }
    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json({ message: 'action must be "add" or "remove"' }, { status: 400 });
    }

    const dlConn = await connectDiamondLedger();
    const update = action === 'add'
      ? { $addToSet: { [field]: value } }
      : { $pull: { [field]: value } };

    await dlConn.collection<LedgerDoc>('data').updateOne(
      { _id: 'ledger' },
      update as mongoose.mongo.UpdateFilter<LedgerDoc>,
      { upsert: true },
    );

    const doc = await getLedgerDoc(dlConn);
    return NextResponse.json({
      shapes:  doc?.shapes  ?? DEFAULT_SHAPES,
      colours: doc?.colours ?? DEFAULT_COLOURS,
      sizes:   doc?.sizes   ?? DEFAULT_SIZES,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
