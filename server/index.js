const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const { connectDiamondLedger } = require('./db');
const productRoutes = require('./routes/products');
const stockCheckRoutes = require('./routes/stockCheck');
const gaugeRoutes      = require('./routes/gauge');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
connectDiamondLedger();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/stock-check', stockCheckRoutes);
app.use('/api/gauge', gaugeRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Prana Order API running on http://localhost:${PORT}`);
});
