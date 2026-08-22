import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';

// ── GET /api/settings/shapes ────────────────────────────────────────────────────

export async function GET() {
  try {
    await connectDB();
    const doc = await Settings.findOne({ key: 'customShapes' });
    return NextResponse.json({ shapes: (doc?.value as string[] | undefined) ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── POST /api/settings/shapes ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { shape } = await request.json();

    if (!shape || typeof shape !== 'string' || !shape.trim()) {
      return NextResponse.json({ message: 'Shape is required' }, { status: 400 });
    }
    const normalized = shape.trim().toUpperCase();

    let doc = await Settings.findOne({ key: 'customShapes' });
    if (!doc) doc = new Settings({ key: 'customShapes', value: [] });

    const shapes: string[] = Array.isArray(doc.value) ? doc.value : [];
    const exists = shapes.some(s => typeof s === 'string' && s.toUpperCase() === normalized);
    if (exists) return NextResponse.json({ shapes });

    shapes.push(normalized);
    doc.value = shapes;
    doc.markModified('value');
    await doc.save();

    return NextResponse.json({ shapes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
