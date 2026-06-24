const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

const DIAMOND_TYPES = new Set(['Diamond', 'Colored Diamond']);
const COLOUR_TYPES  = new Set(['Colourstone', 'Pearl']);

function calcStoneTotals(stoneLines = []) {
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
    totalDiamondPcs:        hasDiamond ? dPcs : undefined,
    totalColourStoneWeight: hasColour  ? parseFloat(cWeight.toFixed(3)) : undefined,
    totalColourstonePcs:    hasColour  ? cPcs : undefined,
  };
}

// Scalar fields tracked in the changelog on every PUT
// (totalDiamond* and totalColourstone* are derived from stoneLines — not tracked directly)
const TRACKED_FIELDS = [
  'designNumber', 'category', 'categoryCode', 'style', 'styleCode', 'queueCode',
  'size', 'cadImageUrl', 'rhodiumInstruction', 'status', 'remarks',
];

// Array fields are compared by JSON serialisation
const TRACKED_ARRAYS = ['additionalImages', 'stoneLines', 'versions', 'goldWeights'];

function buildChangelog(existing, updates) {
  const entries = [];
  const now = new Date();

  for (const field of TRACKED_FIELDS) {
    if (!(field in updates)) continue;
    const oldVal = existing[field];
    const newVal = updates[field];
    if (String(oldVal ?? '') !== String(newVal ?? '')) {
      entries.push({ field, oldValue: oldVal ?? null, newValue: newVal ?? null, changedAt: now });
    }
  }

  for (const field of TRACKED_ARRAYS) {
    if (!(field in updates)) continue;
    const oldJson = JSON.stringify(existing[field] ?? []);
    const newJson = JSON.stringify(updates[field] ?? []);
    if (oldJson !== newJson) {
      entries.push({ field, oldValue: existing[field] ?? [], newValue: updates[field] ?? [], changedAt: now });
    }
  }

  return entries;
}

// ─── GET /api/products/stats ────────────────────────────────────────── (must be before /:id)
router.get('/stats', async (req, res) => {
  try {
    const [total, byStatus, byCategory] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({ total, byStatus, byCategory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/products ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category, status, page = '1', limit = '20' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { designNumber: { $regex: search, $options: 'i' } },
        { category:     { $regex: search, $options: 'i' } },
        { style:        { $regex: search, $options: 'i' } },
        { queueCode:    { $regex: search, $options: 'i' } },
      ];
    }
    if (category)     query.category = category;
    if (status)       query.status = status;
const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-changelog -stoneLines -versions') // keep list response lean
        .sort({ designNumber: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);
    res.json({ products, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/products ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { changelog: _ignored, ...data } = req.body;
    if (data.stoneLines) Object.assign(data, calcStoneTotals(data.stoneLines));
    const product = new Product(data);
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── GET /api/products/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/products/:id ──────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const { changelog: _ignored, ...updates } = req.body;

    // Recalculate stone totals server-side whenever stoneLines are included
    if ('stoneLines' in updates) Object.assign(updates, calcStoneTotals(updates.stoneLines));

    // Build changelog entries before applying changes
    const newEntries = buildChangelog(existing, updates);

    // Apply updates
    Object.assign(existing, updates);

    // Append changelog entries
    if (newEntries.length > 0) {
      existing.changelog.push(...newEntries);
    }

    const updated = await existing.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── POST /api/products/:id/versions ───────────────────────────────────────
router.post('/:id/versions', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const highest = product.versions.reduce((max, v) => Math.max(max, v.versionNumber ?? 1), 1);
    const versionNumber = highest + 1;

    const { versionNumber: _ignored, ...body } = req.body;
    if (body.stoneLines) Object.assign(body, calcStoneTotals(body.stoneLines));
    product.versions.push({ ...body, versionNumber });
    product.changelog.push({
      field: 'versions',
      oldValue: null,
      newValue: `Version ${versionNumber} added`,
      changedAt: new Date(),
    });

    const updated = await product.save();
    res.status(201).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── PUT /api/products/:id/versions/:versionNumber ─────────────────────────
router.put('/:id/versions/:versionNumber', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const vNum = parseInt(req.params.versionNumber);
    const version = product.versions.find(v => v.versionNumber === vNum);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    const VERSION_SCALAR = ['size','goldWeights','rhodiumInstruction','remarks'];
    const now = new Date();

    for (const field of VERSION_SCALAR) {
      if (!(field in req.body)) continue;
      const oldVal = version[field];
      const newVal = req.body[field];
      if (JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null)) {
        product.changelog.push({ field: `v${vNum}.${field}`, oldValue: oldVal ?? null, newValue: newVal ?? null, changedAt: now });
        version[field] = newVal;
      }
    }

    if ('stoneLines' in req.body) {
      const oldJson = JSON.stringify(version.stoneLines ?? []);
      const newJson = JSON.stringify(req.body.stoneLines ?? []);
      if (oldJson !== newJson) {
        product.changelog.push({ field: `v${vNum}.stoneLines`, oldValue: version.stoneLines ?? [], newValue: req.body.stoneLines ?? [], changedAt: now });
        version.stoneLines = req.body.stoneLines;
      }
      Object.assign(version, calcStoneTotals(req.body.stoneLines));
    }

    const updated = await product.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── DELETE /api/products/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted', designNumber: product.designNumber });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
