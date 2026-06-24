'use strict';

/**
 * One-time import: parse Prana_Master_Diamond_Gauge_v2.xlsx and populate diamond_gauge collection.
 *
 * Requires the xlsx package:
 *   npm install xlsx
 *
 * Run from the project root:
 *   node server/scripts/importGauge.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path     = require('path');
const mongoose = require('mongoose');
const XLSX     = require('xlsx');

const XLSX_PATH = path.resolve(__dirname, '../../Prana_Master_Diamond_Gauge_v2.xlsx');

function fmt2dp(n) {
  return parseFloat(n).toFixed(2);
}

function validCarat(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0;
}

function parseRoundSheet(wb) {
  const ws = wb.Sheets['Round Gauge'];
  if (!ws) throw new Error('Sheet "Round Gauge" not found');

  const rows = XLSX.utils.sheet_to_json(ws, { range: 3, defval: null });
  const entries = [];

  for (const row of rows) {
    const size  = parseFloat(row['Size (mm)']);
    const carat = parseFloat(row['Carat / stone']);
    const rate  = row['Avg ₹/ct paid'];

    if (!Number.isFinite(size) || !validCarat(carat)) continue;

    entries.push({
      type:          'ROUND',
      shape:         'ROUND',
      sizeStr:       fmt2dp(size),
      L:             size,
      W:             null,
      caratPerStone: carat,
      avgRatePerCt:  Number.isFinite(parseFloat(rate)) ? parseFloat(rate) : null,
    });
  }

  return entries;
}

function parseFancySheet(wb) {
  const ws = wb.Sheets['Fancy Gauge'];
  if (!ws) throw new Error('Sheet "Fancy Gauge" not found');

  const rows = XLSX.utils.sheet_to_json(ws, { range: 3, defval: null });
  const entries = [];

  for (const row of rows) {
    const shape = typeof row['Shape'] === 'string' ? row['Shape'].trim().toUpperCase() : '';
    if (!shape) continue;

    const carat = parseFloat(row['Carat / stone']);
    if (!validCarat(carat)) continue;

    const L    = parseFloat(row['L']);
    const W    = parseFloat(row['W']);
    const hasW = Number.isFinite(W);

    // sizeStr: uppercase the separator x → X
    const rawSize = typeof row['Size (L×W mm)'] === 'string'
      ? row['Size (L×W mm)'].trim().toUpperCase()
      : (Number.isFinite(L) ? fmt2dp(L) : '');

    const rate = row['Avg ₹/ct paid'];

    entries.push({
      type:          'FANCY',
      shape,
      sizeStr:       rawSize,
      L:             Number.isFinite(L) ? L : null,
      W:             hasW ? W : null,
      caratPerStone: carat,
      avgRatePerCt:  Number.isFinite(parseFloat(rate)) ? parseFloat(rate) : null,
    });
  }

  return entries;
}

async function run() {
  const wb = XLSX.readFile(XLSX_PATH);

  const roundEntries = parseRoundSheet(wb);
  const fancyEntries = parseFancySheet(wb);
  const all          = [...roundEntries, ...fancyEntries];

  console.log(`Parsed: ${roundEntries.length} round, ${fancyEntries.length} fancy`);

  await mongoose.connect(process.env.MONGO_URI, { dbName: 'prana-order' });
  console.log('Connected to prana-order');

  const col = mongoose.connection.collection('diamond_gauge');
  await col.drop().catch(() => {});
  const result = await col.insertMany(all);

  console.log(`Imported ${result.insertedCount} entries (${roundEntries.length} round, ${fancyEntries.length} fancy)`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
