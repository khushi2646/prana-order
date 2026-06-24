import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { calcStoneTotals, buildChangelog } from '@/lib/productUtils';

type Ctx = { params: Promise<{ id: string }> };

// ── GET /api/products/[id] ────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    return NextResponse.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── PUT /api/products/[id] ────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const existing = await Product.findById(id);
    if (!existing) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    const body = await request.json();
    const { changelog: _ignored, ...updates } = body;

    // Recalculate stone totals server-side whenever stoneLines are included
    if ('stoneLines' in updates) Object.assign(updates, calcStoneTotals(updates.stoneLines));

    // Build changelog entries before applying changes
    const newEntries = buildChangelog(
      existing.toObject() as unknown as Record<string, unknown>,
      updates,
    );

    // Apply updates
    Object.assign(existing, updates);

    // Append changelog entries
    if (newEntries.length > 0) {
      existing.changelog.push(...newEntries);
    }

    const updated = await existing.save();
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}

// ── DELETE /api/products/[id] ─────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    return NextResponse.json({ message: 'Product deleted', designNumber: product.designNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
