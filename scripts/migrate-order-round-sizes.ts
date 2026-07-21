import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import Order from '../src/models/Order';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI is not set');

async function run() {
  await mongoose.connect(MONGO_URI!);
  console.log('Connected to MongoDB');

  const orders = await Order.find({ 'products.stoneLines.shape': 'ROUND' });

  let updatedCount = 0;

  for (const order of orders) {
    let modified = false;

    for (const product of order.products as unknown as Array<{ stoneLines?: Array<{ shape?: string; size?: string }> }>) {
      for (const sl of product.stoneLines ?? []) {
        if (sl.shape === 'ROUND' && sl.size && /x/i.test(sl.size)) {
          sl.size = sl.size.split(/x/i)[0].trim();
          modified = true;
        }
      }
    }

    if (modified) {
      order.markModified('products');
      await order.save();
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} orders with ROUND stone line size fixes`);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
