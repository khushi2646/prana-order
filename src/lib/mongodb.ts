import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// ── prana-order connection (default mongoose connection) ──────────────────────

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export default async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: 'prana-order' });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ── diamond_ledger connection (separate named connection) ─────────────────────

interface DiamondLedgerCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _diamondLedgerCache: DiamondLedgerCache | undefined;
}

const dlCached: DiamondLedgerCache = global._diamondLedgerCache ?? { conn: null, promise: null };
global._diamondLedgerCache = dlCached;

export async function connectDiamondLedger(): Promise<mongoose.Connection> {
  if (dlCached.conn) return dlCached.conn;
  if (!dlCached.promise) {
    const uri = process.env.DIAMOND_LEDGER_URI || MONGODB_URI;
    dlCached.promise = mongoose.createConnection(uri, { dbName: 'diamond_ledger' }).asPromise();
  }
  dlCached.conn = await dlCached.promise;
  return dlCached.conn;
}
