import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { calcStoneTotals } from '@/lib/productUtils';

type Ctx = { params: Promise<{ id: string }> };

// ── POST /api/products/[id]/versions ─────────────────────────────────────────

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    const highest = product.versions.reduce(
      (max, v) => Math.max(max, v.versionNumber ?? 1),
      1,
    );
    const versionNumber = highest + 1;

    const body = await request.json();
    const { versionNumber: _ignored, ...rest } = body;

    if (rest.stoneLines) Object.assign(rest, calcStoneTotals(rest.stoneLines));

    product.versions.push({ ...rest, versionNumber });
    product.changelog.push({
      field:     'versions',
      oldValue:  null,
      newValue:  `Version ${versionNumber} added`,
      changedAt: new Date(),
    });

    const updated = await product.save();
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
