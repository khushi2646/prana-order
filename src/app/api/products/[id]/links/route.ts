import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

type Ctx = { params: Promise<{ id: string }> };

// ── POST /api/products/[id]/links ─────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;
    const { targetId } = await request.json();

    const [source, target] = await Promise.all([
      Product.findById(id),
      Product.findById(targetId),
    ]);
    if (!source || !target) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    if (!source.linkedProducts?.some(p => p.toString() === targetId)) {
      source.linkedProducts = [...(source.linkedProducts ?? []), targetId];
    }
    if (!target.linkedProducts?.some(p => p.toString() === id)) {
      target.linkedProducts = [...(target.linkedProducts ?? []), id];
    }

    source.markModified('linkedProducts');
    target.markModified('linkedProducts');
    await Promise.all([source.save(), target.save()]);
    return NextResponse.json(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}

// ── DELETE /api/products/[id]/links ───────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id } = await params;
    const { targetId } = await request.json();

    const [source, target] = await Promise.all([
      Product.findById(id),
      Product.findById(targetId),
    ]);
    if (!source || !target) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    source.linkedProducts = (source.linkedProducts ?? []).filter(p => p.toString() !== targetId);
    target.linkedProducts = (target.linkedProducts ?? []).filter(p => p.toString() !== id);

    source.markModified('linkedProducts');
    target.markModified('linkedProducts');
    await Promise.all([source.save(), target.save()]);
    return NextResponse.json(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
