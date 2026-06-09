const mongoose = require('mongoose');

const diamondSchema = new mongoose.Schema({
  shape: { type: String, required: true },    // e.g. ROUND, PEAR
  size: { type: String, required: true },     // e.g. 2.80 or 4.20X2.75
  colour: { type: String, default: 'WHITE' }, // e.g. WHITE, YELLOW
  quantity: { type: Number, required: true }, // how many stones
  caratPerPiece: { type: Number, required: true } // carat weight per stone
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g. Solitaire Necklace
  category: { type: String, default: '' },      // e.g. Necklace, Bracelet
  description: { type: String, default: '' },
  diamonds: [diamondSchema]                     // array of diamond requirements
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);