const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to cluster\n');

  const db = client.db('diamond_ledger');

  // 1. List all collections
  const cols = await db.listCollections().toArray();
  console.log('=== Collections in diamond-ledger ===');
  cols.forEach(c => console.log(' •', c.name));
  console.log();

  // 2. For each collection, show count + 3 sample documents
  for (const { name } of cols) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    console.log(`=== ${name} (${count} documents) ===`);

    const samples = await col.find().limit(3).toArray();
    samples.forEach((doc, i) => {
      console.log(`--- doc ${i + 1} ---`);
      console.log(JSON.stringify(doc, null, 2));
    });
    console.log();
  }

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
