require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await mongoose.connection.collection('products').deleteMany({});
  console.log(`Deleted ${result.deletedCount} product(s).`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
