import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import Product from '../src/models/Product';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI is not set');

async function run() {
  await mongoose.connect(MONGO_URI!);
  console.log('Connected to MongoDB');

  // ── Part 1 — Pendant Set → Pendant Earrings ─────────────────────────────────
  const legacyProducts = await Product.find({
    $or: [{ category: 'Pendant Set' }, { categoryCode: 'PDS' }],
  });

  let part1Count = 0;
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
    part1Count++;
  }
  console.log(`Part 1 — Pendant Set → Pendant Earrings: ${part1Count} updated`);

  // ── Part 2 — prefix designNumber with its category code ────────────────────
  const allProducts = await Product.find({});

  let part2Count = 0;
  let skippedCount = 0;

  for (const product of allProducts) {
    const code = product.categoryCode;
    if (!code) {
      skippedCount++;
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
    part2Count++;
  }
  console.log(`Part 2 — designNumber prefixed with category code: ${part2Count} updated, ${skippedCount} skipped (no categoryCode)`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
