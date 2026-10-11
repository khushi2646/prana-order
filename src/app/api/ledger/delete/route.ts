import { NextRequest, NextResponse } from 'next/server';
import { connectDiamondLedger } from '@/lib/mongodb';
import mongoose from 'mongoose';

interface LedgerDoc {
  _id: string;
  entries?: { id: number }[];
}

// ── DELETE /api/ledger/delete ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (typeof id !== 'number') {
      return NextResponse.json({ message: 'id is required' }, { status: 400 });
    }

    const dlConn: mongoose.Connection = await connectDiamondLedger();
    await dlConn.collection<LedgerDoc>('data').updateOne(
      { _id: 'ledger' },
      { $pull: { entries: { id } } },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
