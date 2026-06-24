'use strict';

/**
 * One-time migration: regenerate queueCode as designNumber-categoryCode-styleCode
 * for all products that have all three fields set.
 *
 * Run with:
 *   node server/scripts/migrateQueueCode.js
 * from the project root (needs MONGO_URI in .env).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'prana-order' });
  console.log('Connected to prana-order');

  const Product = require('../models/Product');

  // Only touch products that have all three source fields
  const candidates = await Product.find({
    designNumber: { $exists: true, $ne: '' },
    categoryCode: { $exists: true, $ne: '' },
    styleCode:    { $exists: true, $ne: '' },
  }).select('designNumber categoryCode styleCode queueCode');

  let updated = 0;
  for (const p of candidates) {
    const expected = `${p.designNumber}-${p.categoryCode}-${p.styleCode}`;
    if (p.queueCode !== expected) {
      await Product.updateOne({ _id: p._id }, { $set: { queueCode: expected } });
      console.log(`  ${p.designNumber}: "${p.queueCode ?? '(none)'}" → "${expected}"`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} of ${candidates.length} products updated.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
