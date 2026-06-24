import type { IStoneLine } from '@/models/Product';

// ── Stone totals ──────────────────────────────────────────────────────────────

const DIAMOND_TYPES = new Set(['Diamond', 'Colored Diamond']);
const COLOUR_TYPES  = new Set(['Colourstone', 'Pearl']);

export interface StoneTotals {
  totalDiamondWeight?:     number;
  totalDiamondPcs?:        number;
  totalColourStoneWeight?: number;
  totalColourstonePcs?:    number;
}

export function calcStoneTotals(stoneLines: IStoneLine[] = []): StoneTotals {
  let dWeight = 0, dPcs = 0, cWeight = 0, cPcs = 0;
  let hasDiamond = false, hasColour = false;
  for (const l of stoneLines) {
    if (DIAMOND_TYPES.has(l.stoneType ?? '')) {
      hasDiamond = true; dWeight += l.totalWeight ?? 0; dPcs += l.count ?? 0;
    } else if (COLOUR_TYPES.has(l.stoneType ?? '')) {
      hasColour = true; cWeight += l.totalWeight ?? 0; cPcs += l.count ?? 0;
    }
  }
  return {
    totalDiamondWeight:     hasDiamond ? parseFloat(dWeight.toFixed(3)) : undefined,
    totalDiamondPcs:        hasDiamond ? dPcs                           : undefined,
    totalColourStoneWeight: hasColour  ? parseFloat(cWeight.toFixed(3)) : undefined,
    totalColourstonePcs:    hasColour  ? cPcs                           : undefined,
  };
}

// ── Changelog builder ─────────────────────────────────────────────────────────

const TRACKED_FIELDS = [
  'designNumber', 'category', 'categoryCode', 'style', 'styleCode', 'queueCode',
  'size', 'cadImageUrl', 'rhodiumInstruction', 'status', 'remarks',
] as const;

const TRACKED_ARRAYS = ['additionalImages', 'stoneLines', 'versions', 'goldWeights'] as const;

export interface ChangelogEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Date;
}

export function buildChangelog(
  existing: Record<string, unknown>,
  updates: Record<string, unknown>,
): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const now = new Date();

  for (const field of TRACKED_FIELDS) {
    if (!(field in updates)) continue;
    const oldVal = existing[field];
    const newVal = updates[field];
    if (String(oldVal ?? '') !== String(newVal ?? '')) {
      entries.push({ field, oldValue: oldVal ?? null, newValue: newVal ?? null, changedAt: now });
    }
  }

  for (const field of TRACKED_ARRAYS) {
    if (!(field in updates)) continue;
    const oldJson = JSON.stringify(existing[field] ?? []);
    const newJson = JSON.stringify(updates[field] ?? []);
    if (oldJson !== newJson) {
      entries.push({ field, oldValue: existing[field] ?? [], newValue: updates[field] ?? [], changedAt: now });
    }
  }

  return entries;
}
