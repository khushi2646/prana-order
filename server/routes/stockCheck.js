const express = require('express');
const router  = express.Router();
const Product = require('../models/Product');
const { getDiamondLedgerConn } = require('../db');

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseL(sizeStr) {
  if (!sizeStr) return null;
  const s = sizeStr.toString().toUpperCase();
  const xIdx = s.indexOf('X');
  const l = parseFloat(xIdx !== -1 ? s.slice(0, xIdx) : s);
  return Number.isFinite(l) ? l : null;
}

function buildStockMap(entries) {
  const map = {};
  for (const e of entries) {
    const key = `${(e.shape||'').toUpperCase()}|||${(e.size||'').toUpperCase()}|||${(e.colour||'WHITE').toUpperCase()}`;
    if (!map[key]) map[key] = {
      shape:  (e.shape ||'').toUpperCase(),
      size:   (e.size  ||'').toUpperCase(),
      colour: (e.colour||'WHITE').toUpperCase(),
      net: 0,
    };
    map[key].net += e.type === 'IN' ? (e.pieces || 0) : e.type === 'OUT' ? -(e.pieces || 0) : 0;
  }
  return Object.values(map);
}

function getSubstitutes(stockGroups, shape, size, colour) {
  const S   = shape.toUpperCase();
  const SZ  = size.toUpperCase();
  const COL = (colour || 'WHITE').toUpperCase();

  return stockGroups
    .filter(g => g.shape === S && g.colour === COL && g.size !== SZ && g.net > 0)
    .map(g => ({ sizeStr: g.size, availableStock: g.net }))
    .sort((a, b) => (parseL(a.sizeStr) ?? 0) - (parseL(b.sizeStr) ?? 0));
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.get('/:productId', async (req, res) => {
  const product = await Product.findById(req.params.productId).select('stoneLines');
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const conn = getDiamondLedgerConn();
  if (!conn) return res.status(503).json({ message: 'Diamond Ledger DB not connected' });

  const ledgerDoc = await conn.collection('data').findOne({ _id: 'ledger' });
  if (!ledgerDoc) return res.status(503).json({ message: 'Ledger document not found' });

  const entries    = ledgerDoc.entries || [];
  const stockGroups = buildStockMap(entries);

  const results = product.stoneLines
    .filter(line => line.shape)
    .map(line => {
      const shape  = (line.shape  || '').toUpperCase();
      const size   = (line.size   || '').toUpperCase();
      const colour = (line.colour || 'WHITE').toUpperCase();

      const matched = entries.filter(e =>
        e.shape &&
        e.shape.toUpperCase()              === shape  &&
        (e.size   || '').toUpperCase()     === size   &&
        (e.colour || 'WHITE').toUpperCase() === colour
      );

      const inPcs          = matched.filter(e => e.type === 'IN' ).reduce((s, e) => s + (e.pieces || 0), 0);
      const outPcs         = matched.filter(e => e.type === 'OUT').reduce((s, e) => s + (e.pieces || 0), 0);
      const availableStock = inPcs - outPcs;
      const shortfall      = Math.max(0, (line.count || 0) - availableStock);

      return {
        shape,
        size,
        colour,
        requiredPieces:  line.count       || 0,
        requiredWeight:  line.totalWeight || 0,
        availableStock,
        shortfall,
        substitutes: shortfall > 0 ? getSubstitutes(stockGroups, shape, size, colour) : [],
      };
    });

  res.json(results);
});

module.exports = router;
