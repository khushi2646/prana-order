import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { calcStoneTotals } from '@/lib/productUtils';

/**
 * After a gauge entry's caratPerStone changes (create or update), walk all products
 * and recalculate totalWeight on every stone line that matches shape+sizeStr.
 * Also refreshes the product-level and version-level stone totals.
 * Runs as a fire-and-forget background operation — callers should NOT await this.
 */
export async function backfillProductsForGauge(
  shape: string,
  sizeStr: string,
  caratPerStone: number,
): Promise<number> {
  await connectDB();

  const products = await Product.find({
    $or: [
      { stoneLines: { $elemMatch: { shape, size: sizeStr } } },
      { versions:   { $elemMatch: { stoneLines: { $elemMatch: { shape, size: sizeStr } } } } },
    ],
  });

  let updated = 0;

  for (const product of products) {
    let v1Changed      = false;
    let versionChanged = false;

    // ── V1 stone lines ──────────────────────────────────────────────
    for (const sl of product.stoneLines) {
      if (sl.shape === shape && sl.size === sizeStr && sl.count != null) {
        sl.totalWeight = parseFloat((sl.count * caratPerStone).toFixed(3));
        v1Changed = true;
      }
    }

    // ── Version stone lines ─────────────────────────────────────────
    for (const version of product.versions) {
      let thisVersionChanged = false;
      for (const sl of version.stoneLines) {
        if (sl.shape === shape && sl.size === sizeStr && sl.count != null) {
          sl.totalWeight = parseFloat((sl.count * caratPerStone).toFixed(3));
          thisVersionChanged = true;
          versionChanged = true;
        }
      }
      if (thisVersionChanged) {
        const vt = calcStoneTotals(version.stoneLines);
        version.totalDiamondWeight     = vt.totalDiamondWeight;
        version.totalDiamondPcs        = vt.totalDiamondPcs;
        version.totalColourStoneWeight = vt.totalColourStoneWeight;
        version.totalColourstonePcs    = vt.totalColourstonePcs;
      }
    }

    if (v1Changed || versionChanged) {
      if (v1Changed) {
        const t = calcStoneTotals(product.stoneLines);
        product.totalDiamondWeight     = t.totalDiamondWeight;
        product.totalDiamondPcs        = t.totalDiamondPcs;
        product.totalColourStoneWeight = t.totalColourStoneWeight;
        product.totalColourstonePcs    = t.totalColourstonePcs;
        product.markModified('stoneLines');
      }
      if (versionChanged) product.markModified('versions');
      await product.save();
      updated++;
    }
  }

  console.log(`[gauge] backfill: ${updated} product(s) updated for ${shape} ${sizeStr} → ${caratPerStone} ct/stone`);
  return updated;
}
