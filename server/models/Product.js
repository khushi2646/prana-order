const mongoose = require('mongoose');

const StoneLineSchema = new mongoose.Schema({
  stoneType:   { type: String },
  shape:       { type: String },
  size:        { type: String },
  colour:      { type: String, default: 'WHITE' },
  count:       { type: Number },
  totalWeight: { type: Number },
  setting:     { type: String },
  remarks:     { type: String },
});

const VersionSchema = new mongoose.Schema({
  versionNumber:          { type: Number, required: true },
  name:                   { type: String, default: null },
  size:                   { type: String, default: null },
  goldWeights: {
    nineKt:     { type: Number },
    fourteenKt: { type: Number },
    eighteenKt: { type: Number },
  },
  totalDiamondWeight:     { type: Number },
  totalDiamondPcs:        { type: Number },
  totalColourStoneWeight: { type: Number },
  totalColourstonePcs:    { type: Number },
  rhodiumInstruction:     { type: String },
  remarks:                { type: String },
  stoneLines:             [StoneLineSchema],
  createdAt:              { type: Date, default: Date.now },
});

const ChangelogSchema = new mongoose.Schema(
  {
    field:     { type: String, required: true },
    oldValue:  { type: mongoose.Schema.Types.Mixed },
    newValue:  { type: mongoose.Schema.Types.Mixed },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    designNumber: { type: String, required: true, unique: true, trim: true },

    category:     { type: String, trim: true },
    categoryCode: { type: String, trim: true },
    style:        { type: String, trim: true },
    styleCode:    { type: String, trim: true },
    queueCode:    { type: String, trim: true },

    size:               { type: String, default: null },
    cadImageUrl:        { type: String, trim: true },
    additionalImages:   [{ type: String }],

    goldWeights: {
      nineKt:     { type: Number },
      fourteenKt: { type: Number },
      eighteenKt: { type: Number },
    },
    totalDiamondWeight:      { type: Number },
    totalDiamondPcs:         { type: Number },
    totalColourStoneWeight:  { type: Number },
    totalColourstonePcs:     { type: Number },

    rhodiumInstruction: { type: String, trim: true },

    status: {
      type: String,
      enum: ['Pending Review', 'CAD Approved', 'Needs Manual Check', 'In Production', 'Made', 'Hold', 'Rejected'],
      default: 'Pending Review',
    },
    remarks:       { type: String, trim: true },

    stoneLines: [StoneLineSchema],
    versions:   [VersionSchema],
    changelog:  [ChangelogSchema],
  },
  { timestamps: true }
);

// Auto-derive queueCode from designNumber + categoryCode + styleCode when not explicitly set
ProductSchema.pre('save', function () {
  if (!this.queueCode && this.designNumber && this.categoryCode && this.styleCode) {
    this.queueCode = `${this.designNumber}-${this.categoryCode}-${this.styleCode}`;
  }
});

module.exports = mongoose.model('Product', ProductSchema);
