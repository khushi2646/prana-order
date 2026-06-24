'use strict';

/**
 * One-time migration: convert goldKarat + goldWeight → goldWeights.{nineKt|fourteenKt|eighteenKt}
 * for all products (top-level fields only; version sub-documents are unlikely to have data yet).
 *
 * Run with:
 *   node server/scripts/migrateGoldWeights.js
 * from the project root.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const KARAT_TO_FIELD = { 9: 'nineKt', 14: 'fourteenKt', 18: 'eighteenKt' };

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'prana-order' });
  console.log('Connected to prana-order');

  // Use the raw collection to bypass schema stripping of old fields
  const col = mongoose.connection.collection('products');

  const candidates = await col.find({
    goldKarat: { $exists: true },
    goldWeight: { $exists: true },
  }, { projection: { designNumber: 1, goldKarat: 1, goldWeight: 1 } }).toArray();

  let updated = 0;
  for (const p of candidates) {
    const field = KARAT_TO_FIELD[p.goldKarat];
    if (!field) {
      console.log(`  ${p.designNumber}: unrecognised karat ${p.goldKarat} — skipped`);
      continue;
    }
    await col.updateOne(
      { _id: p._id },
      {
        $set:   { [`goldWeights.${field}`]: p.goldWeight },
        $unset: { goldKarat: 1, goldWeight: 1 },
      }
    );
    console.log(`  ${p.designNumber}: goldKarat=${p.goldKarat}, goldWeight=${p.goldWeight}g → goldWeights.${field}=${p.goldWeight}g`);
    updated++;
  }

  console.log(`\nDone. ${updated} of ${candidates.length} products migrated.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
