'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

function objToStr(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const { length, width, unit } = s;
  if (!length) return null;
  const u = unit ?? 'mm';
  return width ? `${length}${u} × ${width}${u}` : `${length}${u}`;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'prana-order' });
  const col = mongoose.connection.collection('products');

  const products = await col.find({}).toArray();
  let migrated = 0;

  for (const p of products) {
    const $set = {};

    if (p.size && typeof p.size === 'object' && !Array.isArray(p.size)) {
      $set.size = objToStr(p.size);
    }

    if (Array.isArray(p.versions)) {
      const newVersions = p.versions.map(v => {
        if (v.size && typeof v.size === 'object' && !Array.isArray(v.size)) {
          return { ...v, size: objToStr(v.size) };
        }
        return v;
      });
      const anyChanged = newVersions.some((nv, i) => nv.size !== p.versions[i].size);
      if (anyChanged) $set.versions = newVersions;
    }

    if (Object.keys($set).length > 0) {
      await col.updateOne({ _id: p._id }, { $set });
      migrated++;
    }
  }

  console.log(`Done — migrated ${migrated} of ${products.length} products`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
