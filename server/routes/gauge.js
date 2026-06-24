'use strict';

const express      = require('express');
const router       = express.Router();
const DiamondGauge = require('../models/DiamondGauge');
const { getDiamondLedgerConn } = require('../db');

// ── helpers ──────────────────────────────────────────────────────────────────

function ledgerStock(entries, shape, sizeStr) {
  const s  = shape.toUpperCase();
  const sz = sizeStr.toUpperCase();
  const matched = entries.filter(e =>
    (e.shape  || '').toUpperCase() === s &&
    (e.size   || '').toUpperCase() === sz &&
    (e.colour || 'WHITE').toUpperCase() === 'WHITE'
  );
  const inPcs  = matched.filter(e => e.type === 'IN') .reduce((n, e) => n + (e.pieces || 0), 0);
  const outPcs = matched.filter(e => e.type === 'OUT').reduce((n, e) => n + (e.pieces || 0), 0);
  return inPcs - outPcs;
}

// ── GET /api/gauge (all entries) ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const entries = await DiamondGauge.find().lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/gauge/lookup?shape=ROUND&L=1.30&W= ──────────────────────────────
router.get('/lookup', async (req, res) => {
  const shape = (req.query.shape || '').toUpperCase();
  const L     = parseFloat(req.query.L);
  const W     = parseFloat(req.query.W);
  const hasW  = Number.isFinite(W);

  if (!shape || !Number.isFinite(L)) {
    return res.status(400).json({ message: 'shape and L are required' });
  }

  if (shape === 'ROUND') {
    const sizeStr = L.toFixed(2);
    const exact   = await DiamondGauge.findOne({ type: 'ROUND', sizeStr });
    if (exact) {
      return res.json({ shape, sizeStr, caratPerStone: exact.caratPerStone, avgRatePerCt: exact.avgRatePerCt, isExact: true, matchedSizeStr: sizeStr });
    }
    const all     = await DiamondGauge.find({ type: 'ROUND' });
    const nearest = all.reduce((best, e) => {
      const d = Math.abs(e.L - L);
      return d < best.d ? { d, e } : best;
    }, { d: Infinity, e: null }).e;
    if (!nearest) return res.status(404).json({ message: 'No round gauge entries found' });
    return res.json({ shape, sizeStr, caratPerStone: nearest.caratPerStone, avgRatePerCt: nearest.avgRatePerCt, isExact: false, matchedSizeStr: nearest.sizeStr });
  }

  // FANCY
  const sizeStr = hasW ? `${L.toFixed(2)}X${W.toFixed(2)}` : L.toFixed(2);
  const exact   = await DiamondGauge.findOne({ type: 'FANCY', shape, sizeStr });
  if (exact) {
    return res.json({ shape, sizeStr, caratPerStone: exact.caratPerStone, avgRatePerCt: exact.avgRatePerCt, isExact: true, matchedSizeStr: sizeStr });
  }
  const all     = await DiamondGauge.find({ type: 'FANCY', shape });
  const area    = hasW ? L * W : L * L;
  const nearest = all.reduce((best, e) => {
    const eArea = (e.W != null) ? e.L * e.W : e.L * e.L;
    const d     = Math.abs(eArea - area);
    return d < best.d ? { d, e } : best;
  }, { d: Infinity, e: null }).e;
  if (!nearest) return res.status(404).json({ message: `No fancy gauge entries found for shape ${shape}` });
  return res.json({ shape, sizeStr, caratPerStone: nearest.caratPerStone, avgRatePerCt: nearest.avgRatePerCt, isExact: false, matchedSizeStr: nearest.sizeStr });
});

// ── GET /api/gauge/substitutes?shape=ROUND&L=1.30&W=&requiredPcs=20 ──────────
router.get('/substitutes', async (req, res) => {
  const shape       = (req.query.shape || '').toUpperCase();
  const L           = parseFloat(req.query.L);
  const W           = parseFloat(req.query.W);
  const hasW        = Number.isFinite(W);
  const requiredPcs = parseInt(req.query.requiredPcs) || 0;

  if (!shape || !Number.isFinite(L)) {
    return res.status(400).json({ message: 'shape and L are required' });
  }

  // Determine tolerance (or bail with no substitutes)
  let tolerance;
  if (shape === 'ROUND') {
    if (L < 3)       return res.json({ substitutes: [] });
    tolerance = L <= 6 ? 0.1 : 0.3;
  } else {
    if (L < 4)       return res.json({ substitutes: [] });
    tolerance = L <= 6 ? 0.1 : 0.3;
  }

  // Fetch candidates from gauge
  const query = shape === 'ROUND'
    ? { type: 'ROUND', L: { $gte: L - tolerance, $lte: L + tolerance } }
    : { type: 'FANCY', shape, L: { $gte: L - tolerance, $lte: L + tolerance } };

  const candidates = await DiamondGauge.find(query);

  // Load ledger once
  const conn = getDiamondLedgerConn();
  if (!conn) return res.status(503).json({ message: 'Diamond Ledger DB not connected' });
  const ledgerDoc = await conn.collection('data').findOne({ _id: 'ledger' });
  const entries   = ledgerDoc ? (ledgerDoc.entries || []) : [];

  const substitutes = candidates
    .map(c => ({
      sizeStr:        c.sizeStr,
      caratPerStone:  c.caratPerStone,
      availableStock: ledgerStock(entries, c.shape, c.sizeStr),
    }))
    .filter(s => s.availableStock >= requiredPcs);

  res.json({ substitutes });
});

// ── PUT /api/gauge/:id ────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { caratPerStone, avgRatePerCt } = req.body;
    if (!Number.isFinite(caratPerStone) || caratPerStone <= 0) {
      return res.status(400).json({ message: 'caratPerStone must be a positive number' });
    }
    const entry = await DiamondGauge.findByIdAndUpdate(
      req.params.id,
      { $set: { caratPerStone, avgRatePerCt: avgRatePerCt ?? null } },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ message: 'Gauge entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
