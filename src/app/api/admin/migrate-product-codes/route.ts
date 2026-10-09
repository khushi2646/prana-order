import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectDB();

    // ── Part 1 — Pendant Set → Pendant Earrings ─────────────────────────────────
    const legacyProducts = await Product.find({
      $or: [{ category: 'Pendant Set' }, { categoryCode: 'PDS' }],
    });

    let pendantSetFixed = 0;
    for (const product of legacyProducts) {
      product.category = 'Pendant Earrings';
      product.categoryCode = 'PDE';
      if (product.queueCode) {
        product.queueCode = product.queueCode.replace(/PDS/g, 'PDE');
      }
      if (product.designNumber && product.designNumber.includes('PDS')) {
        product.designNumber = product.designNumber.replace(/PDS/g, 'PDE');
      }
      await product.save();
      pendantSetFixed++;
    }

    // ── Part 2 — prefix designNumber with its category code ────────────────────
    const allProducts = await Product.find({});

    let codesUpdated = 0;
    let skipped = 0;

    for (const product of allProducts) {
      const code = product.categoryCode;
      if (!code) {
        skipped++;
        continue;
      }

      if (product.designNumber.startsWith(`${code}-`)) continue;

      const oldDesignNumber = product.designNumber;
      const newDesignNumber = `${code}-${oldDesignNumber}`;
      product.designNumber = newDesignNumber;

      if (product.queueCode && product.queueCode.startsWith(oldDesignNumber)) {
        product.queueCode = newDesignNumber + product.queueCode.slice(oldDesignNumber.length);
      }

      await product.save();
      codesUpdated++;
    }

    return NextResponse.json({ pendantSetFixed, codesUpdated, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
