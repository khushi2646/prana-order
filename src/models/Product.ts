import mongoose, { Schema, Model, Document } from 'mongoose';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IStoneLine {
  stoneType?: string;
  shape?: string;
  size?: string;
  colour?: string;
  count?: number;
  totalWeight?: number;
  setting?: string;
  remarks?: string;
}

export interface IGoldWeights {
  nineKt?: number;
  fourteenKt?: number;
  eighteenKt?: number;
}

export interface IVersion {
  versionNumber: number;
  name?: string | null;
  size?: string | null;
  goldWeights?: IGoldWeights;
  totalDiamondWeight?: number;
  totalDiamondPcs?: number;
  totalColourStoneWeight?: number;
  totalColourstonePcs?: number;
  rhodiumInstruction?: string;
  remarks?: string;
  stoneLines: IStoneLine[];
  createdAt: Date;
}

export interface IChangelog {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedAt: Date;
}

export interface IProduct extends Document {
  designNumber: string;
  category?: string;
  categoryCode?: string;
  style?: string;
  styleCode?: string;
  queueCode?: string;
  size?: string | null;
  cadImageUrl?: string;
  additionalImages: string[];
  goldWeights?: IGoldWeights;
  totalDiamondWeight?: number;
  totalDiamondPcs?: number;
  totalColourStoneWeight?: number;
  totalColourstonePcs?: number;
  rhodiumInstruction?: string;
  status: 'Pending' | 'Needs Manual Check' | 'Hold' | 'Rejected' | 'Approved';
  remarks?: string;
  stoneLines: IStoneLine[];
  versions: IVersion[];
  changelog: IChangelog[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const StoneLineSchema = new Schema<IStoneLine>({
  stoneType:   { type: String },
  shape:       { type: String },
  size:        { type: String },
  colour:      { type: String, default: 'WHITE' },
  count:       { type: Number },
  totalWeight: { type: Number },
  setting:     { type: String },
  remarks:     { type: String },
});

const VersionSchema = new Schema<IVersion>({
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

const ChangelogSchema = new Schema<IChangelog>(
  {
    field:     { type: String, required: true },
    oldValue:  { type: Schema.Types.Mixed },
    newValue:  { type: Schema.Types.Mixed },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Product schema ────────────────────────────────────────────────────────────

const ProductSchema = new Schema<IProduct>(
  {
    designNumber: { type: String, required: true, unique: true, trim: true },

    category:     { type: String, trim: true },
    categoryCode: { type: String, trim: true },
    style:        { type: String, trim: true },
    styleCode:    { type: String, trim: true },
    queueCode:    { type: String, trim: true },

    size:             { type: String, default: null },
    cadImageUrl:      { type: String, trim: true },
    additionalImages: [{ type: String }],

    goldWeights: {
      nineKt:     { type: Number },
      fourteenKt: { type: Number },
      eighteenKt: { type: Number },
    },
    totalDiamondWeight:     { type: Number },
    totalDiamondPcs:        { type: Number },
    totalColourStoneWeight: { type: Number },
    totalColourstonePcs:    { type: Number },

    rhodiumInstruction: { type: String, trim: true },

    status: {
      type: String,
      enum: ['Pending', 'Needs Manual Check', 'Hold', 'Rejected', 'Approved'],
      default: 'Pending',
    },
    remarks: { type: String, trim: true },

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

// Avoid "Cannot overwrite model" error on Next.js hot reload
const Product: Model<IProduct> =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
