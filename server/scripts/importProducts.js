require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');
const Product  = require('../models/Product');

// ── Category / style code map (mirrors AddProductDrawer.tsx) ─────────────────
const CATEGORY_MAP = {
  Ring:               { code: 'RNG', styles: [{ label: 'Solitaire Ring', code: 'SOLR' }, { label: 'Two Stone Ring', code: 'TWOR' }, { label: 'Three Stone Ring', code: 'THRR' }, { label: 'Cocktail Ring', code: 'COKR' }, { label: 'Cocktail Ring with Colourstone', code: 'CSCR' }, { label: 'Fancy Ring', code: 'FANC' }, { label: 'Fancy Band', code: 'FBNR' }, { label: 'Band Ring', code: 'BAND' }, { label: 'Daily Ring', code: 'DALY' }] },
  Earrings:           { code: 'ERG', styles: [{ label: 'Stud', code: 'STUD' }, { label: 'Solitaire', code: 'SOLE' }, { label: 'Two Stone', code: 'TWOE' }, { label: 'Fancy', code: 'FANE' }, { label: 'Cocktail', code: 'COKE' }, { label: 'Colourstone', code: 'COLE' }, { label: 'Halo', code: 'HALE' }, { label: 'Cluster', code: 'CLUE' }, { label: 'Danglers', code: 'DANL' }, { label: 'Drop', code: 'DROP' }, { label: 'Long', code: 'LONG' }, { label: 'Hoops', code: 'HOOP' }, { label: 'Huggies', code: 'HUGG' }, { label: 'Jhumka', code: 'JHUM' }, { label: 'Chandbali', code: 'CHAN' }, { label: 'Ear Cuff', code: 'CUFF' }, { label: 'Ear Jacket', code: 'JACK' }] },
  Pendant:            { code: 'PDT', styles: [{ label: 'Solitaire', code: 'SOLP' }, { label: 'Two Stone', code: 'TWOP' }, { label: 'Fancy', code: 'FANP' }, { label: 'Cocktail', code: 'COKP' }, { label: 'Colourstone', code: 'COLP' }, { label: 'Daily', code: 'DAIL' }] },
  'Pendant Set':      { code: 'PDS', styles: [{ label: 'Solitaire', code: 'SOPS' }, { label: 'Two Stone', code: 'TWPS' }, { label: 'Fancy', code: 'FNPS' }, { label: 'Cocktail', code: 'COPS' }, { label: 'Colourstone', code: 'CLPS' }, { label: 'Floral', code: 'FLPS' }, { label: 'Halo', code: 'HLPS' }, { label: 'Cluster', code: 'CLST' }] },
  Necklace:           { code: 'NCK', styles: [{ label: 'Choker', code: 'CHKR' }, { label: 'Single Strand Tennis', code: 'SSTN' }, { label: 'Tennis', code: 'TENN' }, { label: 'Lariat', code: 'LART' }, { label: 'Collar', code: 'COLL' }, { label: 'Chain', code: 'CHNK' }, { label: 'Multi-line', code: 'MLNE' }, { label: 'Hasli Collar Choker', code: 'HCCN' }, { label: 'Fancy', code: 'FNNK' }] },
  'Necklace Earrings':{ code: 'NKE', styles: [{ label: 'Necklace Earrings', code: 'NECK' }] },
  Bracelet:           { code: 'BRC', styles: [{ label: 'Tennis', code: 'TENB' }, { label: 'Single Line', code: 'SLBR' }, { label: 'Station', code: 'STBR' }, { label: 'Oval Fancy', code: 'OVFB' }, { label: 'Solitaire Oval', code: 'SOVB' }, { label: 'Daily Oval', code: 'DOVB' }, { label: 'Fancy', code: 'FANB' }, { label: 'Cocktail', code: 'COKB' }, { label: 'Broad', code: 'BRDB' }, { label: 'Delicate', code: 'DELB' }, { label: 'Bangle', code: 'BNGL' }, { label: 'Kada', code: 'KADA' }, { label: 'Charm', code: 'CHRM' }] },
  'Chain Pendant':    { code: 'CHP', styles: [{ label: 'Hanging Pieces', code: 'HNGP' }, { label: 'Attached Pieces', code: 'ATCP' }, { label: 'With Colourstone', code: 'WCOL' }, { label: 'Gold Links', code: 'GLNK' }, { label: 'Station Chain', code: 'STCH' }, { label: 'Lariat', code: 'LART' }, { label: 'Mangalsutra', code: 'MNGL' }] },
};

const VALID_STATUSES = new Set(['Pending Review', 'CAD Approved', 'Needs Manual Check', 'In Production', 'Made', 'Hold', 'Rejected']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCodes(category, style) {
  const cat = CATEGORY_MAP[category];
  if (!cat) return { categoryCode: null, styleCode: null };
  const styleEntry = cat.styles.find(s => s.label === style);
  return { categoryCode: cat.code, styleCode: styleEntry ? styleEntry.code : null };
}

// Returns null for blank, "Needs Manual Check", or non-numeric values
function parseNum(val) {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'string' && val.trim() === 'Needs Manual Check') return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

// Returns undefined (omit field) for blank or "Needs Manual Check"; otherwise trimmed string
function cleanStr(val) {
  if (val === '' || val === null || val === undefined) return undefined;
  const s = String(val).trim();
  if (s === 'Needs Manual Check' || s === '') return undefined;
  return s;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const xlsxPath = path.join(__dirname, '../../CAD Product Master final.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets['Product Master P001-P0136'];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  console.log(`Sheet rows found: ${rows.length}`);

  let totalRead = 0, imported = 0;
  const skipped = [];

  for (const row of rows) {
    totalRead++;

    // ── Design number ─────────────────────────────────────────────────────────
    const designNumber = String(row['Design Number'] ?? '').trim().toUpperCase();
    if (!designNumber) {
      skipped.push({ row: totalRead, reason: 'blank Design Number' });
      continue;
    }

    // ── Category / style codes ────────────────────────────────────────────────
    const category = cleanStr(row['Product Category']);
    const style    = cleanStr(row['Product Style']);
    const { categoryCode, styleCode } = getCodes(category ?? '', style ?? '');

    // ── Status ────────────────────────────────────────────────────────────────
    const rawStatus = cleanStr(row['Status']);
    const status    = rawStatus && VALID_STATUSES.has(rawStatus) ? rawStatus : 'Pending Review';

    // ── Size (store as-is string; skip "Needs Manual Check") ─────────────────
    const size = cleanStr(row['Product Size']) ?? null;

    // ── CAD image (only Google Drive links) ───────────────────────────────────
    const rawCad   = String(row['CAD Image Link'] ?? '').trim();
    const cadImageUrl = rawCad.startsWith('https://drive.google.com') ? rawCad : undefined;

    // ── Gold weights ──────────────────────────────────────────────────────────
    const nineKt     = parseNum(row['9KT Gold Wt (g)']);
    const fourteenKt = parseNum(row['14KT Gold Wt (g)']);
    const eighteenKt = parseNum(row['18KT Gold Wt (g)']);
    const goldWeights = {};
    if (nineKt     !== null) goldWeights.nineKt     = nineKt;
    if (fourteenKt !== null) goldWeights.fourteenKt = fourteenKt;
    if (eighteenKt !== null) goldWeights.eighteenKt = eighteenKt;

    // ── Misc fields ───────────────────────────────────────────────────────────
    const rhodiumInstruction = cleanStr(row['Rhodium Instruction']);
    const remarks            = cleanStr(row['Marks / Remarks']);

    // ── Queue code ────────────────────────────────────────────────────────────
    // Build explicitly here; pre-save hook also fires but only if queueCode is unset.
    const queueCode = (categoryCode && styleCode)
      ? `${designNumber}-${categoryCode}-${styleCode}`
      : undefined;

    // ── Build document ────────────────────────────────────────────────────────
    const doc = {
      designNumber,
      status,
      size,
      stoneLines: [],
      ...(category        && { category }),
      ...(categoryCode    && { categoryCode }),
      ...(style           && { style }),
      ...(styleCode       && { styleCode }),
      ...(queueCode       && { queueCode }),
      ...(cadImageUrl     && { cadImageUrl }),
      ...(Object.keys(goldWeights).length && { goldWeights }),
      ...(rhodiumInstruction && { rhodiumInstruction }),
      ...(remarks            && { remarks }),
    };

    try {
      await Product.create(doc);
      imported++;
    } catch (err) {
      skipped.push({ row: totalRead, designNumber, reason: err.message });
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n── Import Summary ───────────────────────────');
  console.log(`  Total rows read : ${totalRead}`);
  console.log(`  Imported        : ${imported}`);
  console.log(`  Skipped         : ${skipped.length}`);
  if (skipped.length) {
    console.log('\n  Skip details:');
    skipped.forEach(s => {
      const label = s.designNumber ? `${s.designNumber} (row ${s.row})` : `row ${s.row}`;
      console.log(`    ${label}: ${s.reason}`);
    });
  }
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
