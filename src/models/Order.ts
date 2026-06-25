import mongoose, { Schema, Types } from 'mongoose';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const StoneLineSchema = new Schema(
  {
    shape:         { type: String },
    size:          { type: String },
    colour:        { type: String },
    piecesPerUnit: { type: Number },
    totalPieces:   { type: Number },
  },
  { _id: false },
);

const OrderProductSchema = new Schema(
  {
    productRef:          { type: Types.ObjectId, ref: 'Product', default: null },
    productCode:         { type: String, required: true },
    isNewProduct:        { type: Boolean, default: false },
    newProductDescription: { type: String },
    quantity:            { type: Number, required: true, min: 1 },
    goldColour:          { type: String, enum: ['yellow', 'white', 'rose'], required: true },
    goldCarat:           { type: String, enum: ['9kt', '14kt', '18kt'], required: true },
    findings:            { type: String },
    stoneLines:          [StoneLineSchema],
    stage:               { type: String, enum: ['cad', 'diamond_procurement', 'manufacturing', 'order_received'], default: 'cad' },
    remarks:             { type: String },
  },
  { _id: false },
);

const FollowUpSchema = new Schema(
  {
    date:  { type: Date },
    notes: { type: String },
  },
  { _id: false },
);

// ── Order schema ──────────────────────────────────────────────────────────────

const OrderSchema = new Schema({
  orderId:      { type: String, required: true, unique: true },
  orderType:    { type: String, enum: ['stock', 'customer'], required: true },
  customerName: { type: String, required: true },
  phoneNumber:  { type: String },
  goldRate: {
    isFixed:   { type: Boolean },
    fixedRate: { type: Number },
  },
  targetBudget: { type: Number },
  deliveryDate: { type: Date },
  isUrgent:     { type: Boolean, default: false },
  remarks:      { type: String },
  followUps:    [FollowUpSchema],
  products:     [OrderProductSchema],
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

// ── Validators ────────────────────────────────────────────────────────────────

OrderSchema.pre('save', function () {
  if (this.followUps && this.followUps.length > 3) {
    throw new Error('An order cannot have more than 3 follow-ups');
  }
  this.updatedAt = new Date();
});

// ── Model ─────────────────────────────────────────────────────────────────────

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
