import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';

type Ctx = { params: Promise<{ id: string; productIndex: string }> };

// ── PATCH /api/orders/[id]/products/[productIndex] ────────────────────────────

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id, productIndex } = await params;
    const idx = parseInt(productIndex, 10);

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (idx < 0 || idx >= order.products.length) {
      return NextResponse.json({ message: 'Product index out of range' }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const product = order.products[idx] as Record<string, unknown>;

    // Merge patch fields into the product in memory
    for (const [key, val] of Object.entries(body)) {
      product[key] = val;
    }

    // Recalculate totalPieces if stoneLines or quantity changed
    const quantity = Number(product.quantity);
    if (Array.isArray(product.stoneLines) && quantity > 0) {
      product.stoneLines = (product.stoneLines as Record<string, unknown>[]).map(sl => ({
        ...sl,
        totalPieces:
          sl.piecesPerUnit != null
            ? Number(sl.piecesPerUnit) * quantity
            : sl.totalPieces,
      }));
    }

    order.products[idx] = product as typeof order.products[number];
    order.updatedAt = new Date();
    order.markModified('products');
    await order.save();

    return NextResponse.json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}

// ── DELETE /api/orders/[id]/products/[productIndex] ───────────────────────────

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id, productIndex } = await params;
    const idx = parseInt(productIndex, 10);

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (idx < 0 || idx >= order.products.length) {
      return NextResponse.json({ message: 'Product index out of range' }, { status: 400 });
    }

    order.products.splice(idx, 1);
    order.updatedAt = new Date();
    order.markModified('products');
    await order.save();

    return NextResponse.json(order);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
