require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');
const Product  = require('../models/Product');

async function main() {
  // ── Connect ────────────────────────────────────────────────────────────────
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set in .env'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // ── Read spreadsheet ───────────────────────────────────────────────────────
  const xlsxPath = path.join(__dirname, '../../CAD_IMAGES.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets['Sheet1'];
  if (!ws) { console.error('Sheet1 not found in CAD_IMAGES.xlsx'); process.exit(1); }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`\nTotal rows in spreadsheet: ${rows.length}`);

  // ── Process ────────────────────────────────────────────────────────────────
  let updated = 0;
  let skippedBlank   = 0;
  let skippedNoMatch = 0;
  let skippedNotFound = 0;

  for (const row of rows) {
    const designNumber = (row['Design Number'] ?? '').toString().trim();
    const link         = (row['CAD Image Link'] ?? '').toString().trim();

    if (!link) {
      skippedBlank++;
      continue;
    }
    if (link.includes('No matching image found')) {
      skippedNoMatch++;
      continue;
    }

    const result = await Product.updateOne(
      { designNumber },
      { $set: { cadImageUrl: link } },
    );

    if (result.matchedCount === 0) {
      console.log(`  [not found] ${designNumber}`);
      skippedNotFound++;
    } else {
      updated++;
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n── Summary ──────────────────────────────────');
  console.log(`  Updated:          ${updated}`);
  console.log(`  Skipped (blank):  ${skippedBlank}`);
  console.log(`  Skipped (no img): ${skippedNoMatch}`);
  console.log(`  Not in DB:        ${skippedNotFound}`);
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
