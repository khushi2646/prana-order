import { NextResponse } from 'next/server';
import { connectDiamondLedger } from '@/lib/mongodb';
import mongoose from 'mongoose';

interface LedgerDoc {
  _id: string;
  entries?: unknown[];
}

// ── DELETE /api/ledger/all ────────────────────────────────────────────────────

export async function DELETE() {
  try {
    const dlConn: mongoose.Connection = await connectDiamondLedger();
    await dlConn.collection<LedgerDoc>('data').updateOne(
      { _id: 'ledger' },
      { $set: { entries: [] } },
      { upsert: true },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
