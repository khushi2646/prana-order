import { NextRequest, NextResponse } from 'next/server';
import type { SortOrder } from 'mongoose';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { calcStoneTotals } from '@/lib/productUtils';

// ── GET /api/products ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const search   = searchParams.get('search')   ?? '';
    const category = searchParams.get('category') ?? '';
    const status   = searchParams.get('status')   ?? '';
    const style    = searchParams.get('style')    ?? '';
    const sort     = searchParams.get('sort')     ?? 'newest';
    const page     = parseInt(searchParams.get('page')  ?? '1',  10);
    const limit    = parseInt(searchParams.get('limit') ?? '48', 10);

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { designNumber: { $regex: search, $options: 'i' } },
        { category:     { $regex: search, $options: 'i' } },
        { style:        { $regex: search, $options: 'i' } },
        { queueCode:    { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (status)   query.status   = status;
    if (style)    query.style    = style;

    const sortMap: Record<string, Record<string, SortOrder>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt:  1 },
      az:     { designNumber:  1 },
      za:     { designNumber: -1 },
    };
    const sortOrder = sortMap[sort] ?? { createdAt: -1 };

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-changelog -stoneLines -versions')
        .sort(sortOrder)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({ products, total, page, limit });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── POST /api/products ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { changelog: _ignored, ...data } = body;

    if (data.stoneLines) Object.assign(data, calcStoneTotals(data.stoneLines));

    const product = new Product(data);
    const saved   = await product.save();

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
