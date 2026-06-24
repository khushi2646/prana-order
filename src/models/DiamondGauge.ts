import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IDiamondGauge extends Document {
  type: 'ROUND' | 'FANCY';
  shape: string;
  sizeStr: string;
  L: number;
  W: number | null;
  caratPerStone: number;
  avgRatePerCt: number | null;
}

const DiamondGaugeSchema = new Schema<IDiamondGauge>({
  type:          { type: String, enum: ['ROUND', 'FANCY'], required: true },
  shape:         { type: String, required: true },
  sizeStr:       { type: String, required: true },
  L:             { type: Number, required: true },
  W:             { type: Number, default: null },
  caratPerStone: { type: Number, required: true },
  avgRatePerCt:  { type: Number, default: null },
});

// Avoid "Cannot overwrite model" error on Next.js hot reload
const DiamondGauge: Model<IDiamondGauge> =
  (mongoose.models.DiamondGauge as Model<IDiamondGauge>) ||
  mongoose.model<IDiamondGauge>('DiamondGauge', DiamondGaugeSchema, 'diamond_gauge');

export default DiamondGauge;
