'use strict';

const mongoose = require('mongoose');

const DiamondGaugeSchema = new mongoose.Schema({
  type:           { type: String, enum: ['ROUND', 'FANCY'], required: true },
  shape:          { type: String, required: true },
  sizeStr:        { type: String, required: true },
  L:              { type: Number, required: true },
  W:              { type: Number, default: null },
  caratPerStone:  { type: Number, required: true },
  avgRatePerCt:   { type: Number, default: null },
});

module.exports = mongoose.model('DiamondGauge', DiamondGaugeSchema, 'diamond_gauge');
