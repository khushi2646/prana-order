import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { calcStoneTotals } from '@/lib/productUtils';

type Ctx = { params: Promise<{ id: string; versionNumber: string }> };

const VERSION_SCALAR = ['size', 'goldWeights', 'rhodiumInstruction', 'remarks', 'name'] as const;

// ── PUT /api/products/[id]/versions/[versionNumber] ───────────────────────────

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    await connectDB();
    const { id, versionNumber: vNumStr } = await params;

    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    const vNum    = parseInt(vNumStr, 10);
    const version = product.versions.find(v => v.versionNumber === vNum);
    if (!version) return NextResponse.json({ message: 'Version not found' }, { status: 404 });

    const body = await request.json();
    const now  = new Date();

    for (const field of VERSION_SCALAR) {
      if (!(field in body)) continue;
      const oldVal = version[field as keyof typeof version];
      const newVal = body[field];
      if (JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null)) {
        product.changelog.push({
          field:     `v${vNum}.${field}`,
          oldValue:  oldVal ?? null,
          newValue:  newVal ?? null,
          changedAt: now,
        });
        (version as unknown as Record<string, unknown>)[field] = newVal;
      }
    }

    if ('stoneLines' in body) {
      const oldJson = JSON.stringify(version.stoneLines ?? []);
      const newJson = JSON.stringify(body.stoneLines   ?? []);
      if (oldJson !== newJson) {
        product.changelog.push({
          field:     `v${vNum}.stoneLines`,
          oldValue:  version.stoneLines ?? [],
          newValue:  body.stoneLines    ?? [],
          changedAt: now,
        });
        version.stoneLines = body.stoneLines;
      }
      Object.assign(version, calcStoneTotals(body.stoneLines));
    }

    const updated = await product.save();
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
