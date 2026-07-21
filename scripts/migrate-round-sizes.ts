import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import Product from '../src/models/Product';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI is not set');

async function run() {
  await mongoose.connect(MONGO_URI!);
  console.log('Connected to MongoDB');

  const products = await Product.find({ 'stoneLines.shape': 'ROUND' });

  let updatedCount = 0;

  for (const product of products) {
    let modified = false;

    for (const sl of product.stoneLines) {
      if (sl.shape === 'ROUND' && sl.size && /x/i.test(sl.size)) {
        sl.size = sl.size.split(/x/i)[0].trim();
        modified = true;
      }
    }

    if (modified) {
      product.markModified('stoneLines');
      await product.save();
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} products with ROUND stone line size fixes`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
