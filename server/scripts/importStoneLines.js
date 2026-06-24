require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');
const Product  = require('../models/Product');

// ── Stone totals (mirrors server/routes/products.js) ─────────────────────────
const DIAMOND_TYPES = new Set(['Diamond', 'Colored Diamond']);
const COLOUR_TYPES  = new Set(['Colourstone', 'Pearl']);

function calcStoneTotals(stoneLines) {
  let dWeight = 0, dPcs = 0, cWeight = 0, cPcs = 0;
  let hasDiamond = false, hasColour = false;
  for (const l of stoneLines) {
    if (DIAMOND_TYPES.has(l.stoneType)) {
      hasDiamond = true; dWeight += l.totalWeight ?? 0; dPcs += l.count ?? 0;
    } else if (COLOUR_TYPES.has(l.stoneType)) {
      hasColour = true; cWeight += l.totalWeight ?? 0; cPcs += l.count ?? 0;
    }
  }
  return {
    totalDiamondWeight:     hasDiamond ? parseFloat(dWeight.toFixed(3)) : undefined,
    totalDiamondPcs:        hasDiamond ? dPcs                           : undefined,
    totalColourStoneWeight: hasColour  ? parseFloat(cWeight.toFixed(3)) : undefined,
    totalColourstonePcs:    hasColour  ? cPcs                           : undefined,
  };
}

// ── Size normalisation ────────────────────────────────────────────────────────
// "3.60 x 1.85"  →  "3.60X1.85"
// "1.10"         →  "1.10"
function normaliseSize(raw) {
  if (!raw && raw !== 0) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase().includes(' x ')) {
    return s.replace(/\s*x\s*/i, 'X');
  }
  return s;
}

function parseNum(val) {
  if (val === '' || val === null || val === undefined) return 0;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function cleanStr(val) {
  if (val === '' || val === null || val === undefined) return '';
  return String(val).trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const xlsxPath = path.join(__dirname, '../../Stone_Details_final.xlsx');
  const wb = XLSX.readFile(xlsxPath);

  // Accept either "Stone Details" or the first sheet
  const sheetName = wb.SheetNames.includes('Stone Details')
    ? 'Stone Details'
    : wb.SheetNames[0];
  console.log(`Using sheet: "${sheetName}"`);

  const ws   = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`Rows found: ${rows.length}\n`);

  // ── Group rows by design number ───────────────────────────────────────────
  const grouped = new Map(); // designNumber → StoneLine[]
  let totalRowsRead = 0;
  const skipped = [];

  for (const row of rows) {
    totalRowsRead++;

    const designNumber = String(row['Design Number'] ?? '').trim().toUpperCase();
    if (!designNumber) {
      skipped.push({ row: totalRowsRead, reason: 'blank Design Number' });
      continue;
    }

    const shape = cleanStr(row['Stone Shape']).toUpperCase();
    if (!shape) {
      skipped.push({ row: totalRowsRead, designNumber, reason: 'blank Stone Shape' });
      continue;
    }

    const size = normaliseSize(row['Stone Size (MM)']);
    if (!size) {
      skipped.push({ row: totalRowsRead, designNumber, reason: 'blank Stone Size' });
      continue;
    }

    const stoneType = cleanStr(row['Stone Type']) || 'Diamond';
    const count       = parseNum(row['Stone Count']);
    const totalWeight = parseNum(row['Total Stone Weight (ct)']);
    const setting     = cleanStr(row['Setting']);
    const remarks     = cleanStr(row['Manual Change / Remarks']);

    const line = {
      stoneType,
      shape,
      size,
      colour: 'WHITE',
      count,
      totalWeight,
      ...(setting && { setting }),
      ...(remarks && { remarks }),
    };

    if (!grouped.has(designNumber)) grouped.set(designNumber, []);
    grouped.get(designNumber).push(line);
  }

  // ── Update each product ───────────────────────────────────────────────────
  let productsUpdated = 0, productsNotFound = 0, totalLinesImported = 0;
  const notFound = [];

  for (const [designNumber, stoneLines] of grouped) {
    const totals = calcStoneTotals(stoneLines);

    const result = await Product.findOneAndUpdate(
      { designNumber },
      {
        $set: {
          stoneLines,
          totalDiamondWeight:     totals.totalDiamondWeight     ?? null,
          totalDiamondPcs:        totals.totalDiamondPcs        ?? null,
          totalColourStoneWeight: totals.totalColourStoneWeight ?? null,
          totalColourstonePcs:    totals.totalColourstonePcs    ?? null,
        },
      },
      { new: false }
    );

    if (!result) {
      productsNotFound++;
      notFound.push(designNumber);
    } else {
      productsUpdated++;
      totalLinesImported += stoneLines.length;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('── Import Summary ────────────────────────────');
  console.log(`  Total rows read      : ${totalRowsRead}`);
  console.log(`  Rows skipped         : ${skipped.length}`);
  console.log(`  Products updated     : ${productsUpdated}`);
  console.log(`  Stone lines imported : ${totalLinesImported}`);
  console.log(`  Products not found   : ${productsNotFound}`);

  if (skipped.length) {
    console.log('\n  Skipped rows:');
    skipped.forEach(s => {
      const label = s.designNumber ? `${s.designNumber} row ${s.row}` : `row ${s.row}`;
      console.log(`    ${label}: ${s.reason}`);
    });
  }
  if (notFound.length) {
    console.log('\n  Design numbers not in DB:');
    notFound.forEach(d => console.log(`    ${d}`));
  }
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
