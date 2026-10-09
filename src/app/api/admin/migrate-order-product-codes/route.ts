import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET() {
  try {
    await connectDB();

    const orders = await Order.find({ 'products.productRef': { $ne: null } });

    let ordersUpdated = 0;
    let productCodesUpdated = 0;

    for (const order of orders) {
      let orderModified = false;

      for (const product of order.products as Record<string, unknown>[]) {
        if (!product.productRef) continue;

        const linkedProduct = await Product.findById(product.productRef as string);
        if (!linkedProduct) continue;

        if (product.productCode !== linkedProduct.designNumber) {
          product.productCode = linkedProduct.designNumber;
          orderModified = true;
          productCodesUpdated++;
        }
      }

      if (orderModified) {
        order.markModified('products');
        await order.save();
        ordersUpdated++;
      }
    }

    return NextResponse.json({ ordersUpdated, productCodesUpdated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
