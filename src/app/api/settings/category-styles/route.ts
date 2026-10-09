import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';

const DEFAULT_CATEGORY_STYLES: Record<string, string[]> = {
  Ring: ['Solitaire','Solitaire-with-accents','Three-stone','Two-stone (toi-et-moi)','Halo','Hidden-halo','Bypass','Cluster','Eternity','Half-eternity','Plain band','Cocktail/statement','Stackable','Illusion-set'],
  Earrings: ['Solitaire stud','Halo stud','Cluster stud','Hoop','Huggie','Drop','Dangle','Jhumka','Chandbali','Ear-cuff','Climber'],
  Pendant: ['Solitaire','Halo','Cluster','Motif (heart/evil-eye/initial)','Bar','Geometric','Convertible','Pendant-only','With-chain','Tassel'],
  Necklace: ['Station','Riviera/line','Multi-line/layered','Choker/collar','Lariat/Y'],
  Bracelet: ['Tennis','Station','Bangle','Cuff','Link/chain','Charm','Bar','Adjustable/bolo'],
  'Pendant Earrings': [],
  'Necklace Earrings': [],
  'Chain Pendant': ['Hanging Pieces','Attached Pieces','With Colourstone','Gold Links','Station Chain','Lariat','Mangalsutra'],
};

// ── GET /api/settings/category-styles ───────────────────────────────────────────

export async function GET() {
  try {
    await connectDB();

    const doc = await Settings.findOne({ key: 'categoryStyles' });
    const stored = (doc?.value as Record<string, string[]> | undefined) ?? {};
    const merged: Record<string, string[]> = { ...DEFAULT_CATEGORY_STYLES, ...stored };

    return NextResponse.json({ styles: merged });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ── POST /api/settings/category-styles ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { category, style, action } = await request.json();

    if (!category || !style || !action) {
      return NextResponse.json({ message: 'category, style and action are required' }, { status: 400 });
    }
    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json({ message: 'action must be "add" or "remove"' }, { status: 400 });
    }

    let doc = await Settings.findOne({ key: 'categoryStyles' });
    if (!doc) doc = new Settings({ key: 'categoryStyles', value: {} });

    const current: Record<string, string[]> = (doc.value as Record<string, string[]> | undefined) ?? {};
    const list = current[category] ?? DEFAULT_CATEGORY_STYLES[category] ?? [];

    if (action === 'add') {
      if (!list.includes(style)) list.push(style);
    } else {
      const idx = list.indexOf(style);
      if (idx !== -1) list.splice(idx, 1);
    }

    current[category] = list;
    doc.value = current;
    doc.markModified('value');
    await doc.save();

    const merged: Record<string, string[]> = { ...DEFAULT_CATEGORY_STYLES, ...current };
    return NextResponse.json({ styles: merged });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ message }, { status: 400 });
  }
}
