const mongoose = require('mongoose');

let diamondLedgerConn = null;

module.exports = async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'prana-order',
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports.connectDiamondLedger = async function connectDiamondLedger() {
  try {
    const uri = process.env.DIAMOND_LEDGER_URI || process.env.MONGO_URI;
    diamondLedgerConn = mongoose.createConnection(uri, {
      dbName: 'diamond_ledger',
    });
    // Wait for the connection to open
    await new Promise((resolve, reject) => {
      diamondLedgerConn.once('open', resolve);
      diamondLedgerConn.once('error', reject);
    });
    console.log(`Diamond Ledger DB connected: ${diamondLedgerConn.host}`);
  } catch (err) {
    console.error(`Diamond Ledger connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports.getDiamondLedgerConn = function getDiamondLedgerConn() {
  return diamondLedgerConn;
};
