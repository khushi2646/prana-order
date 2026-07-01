import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import Product from '../src/models/Product';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI is not set');

const MAPPINGS: Array<[string, string]> = [
  ['Pending Review', 'Pending'],
  ['CAD Approved',   'Approved'],
  ['In Production',  'Pending'],
  ['Made',           'Approved'],
];

async function run() {
  await mongoose.connect(MONGO_URI!);
  console.log('Connected to MongoDB');

  for (const [from, to] of MAPPINGS) {
    const res = await Product.collection.updateMany({ status: from }, { $set: { status: to } });
    console.log(`"${from}" → "${to}": ${res.modifiedCount} updated`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
