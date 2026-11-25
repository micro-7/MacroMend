import { buildMatchIndex } from '../../core/match';
import { ALL_FOODS } from '../../data/foods';
import { splitReady, toConfirmItems, withFood, type ConfirmFood } from '../confirm';
import { resolveItems } from '../resolve';

const index = buildMatchIndex(ALL_FOODS.map((f) => ({ id: f.id, name: f.name, aliases: f.aliases })));
const unitMap = new Map(ALL_FOODS.map((f) => [f.id, { unit: f.unit }]));
const foods = new Map<string, ConfirmFood>(ALL_FOODS.map((f) => [f.id, {
  id: f.id, name: f.name, unit: f.unit, gramsPerUnit: f.gramsPerUnit, kcalPer100g: f.kcalPer100g, proteinPer100g: f.proteinPer100g,
}]));
const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];

const resolve = (items: { name: string; qty?: number | string | null; unit?: string; slot?: string }[]) =>
  resolveItems(items.map((i) => ({ name: i.name, qty: i.qty ?? null, unit: i.unit ?? '', slot: i.slot ?? '' })), index, unitMap);

describe('resolveItems', () => {
  it('finds foods, reads number words and fills in the food\'s own unit', () => {
    const [a, b] = resolve([{ name: 'dahi', qty: 'ek', unit: 'katori' }, { name: 'rotis', qty: 'do' }]);
    expect(a).toMatchObject({ status: 'matched', foodId: 'in-curd', qty: 1, unit: 'katori', matchKind: 'exact' });
    expect(b).toMatchObject({ status: 'matched', foodId: 'in-roti', qty: 2, unit: 'piece', matchKind: 'variant' });
  });

  it('marks typos as fuzzy and unknown foods as not found', () => {
    const [a, b] = resolve([{ name: 'panner paratha', qty: 2 }, { name: 'xylophone steak' }]);
    expect(a).toMatchObject({ status: 'matched', foodId: 'in-paneer-paratha', matchKind: 'fuzzy' });
    expect(b).toMatchObject({ status: 'not_found', foodId: null, qty: 1 });
  });

  it('uses 1 and says so when the amount cannot be read', () => {
    const [a] = resolve([{ name: 'roti', qty: 'plenty' }]);
    expect(a).toMatchObject({ qty: 1, quantityGuessed: true });
  });

  it('uses the food\'s own unit for an unknown unit (2 samosa on a plate)', () => {
    const [a] = resolve([{ name: 'samosa', qty: 2, unit: 'plate' }]);
    expect(a).toMatchObject({ qty: 2, unit: 'piece', unitRecognized: false });
  });
});

describe('toConfirmItems', () => {
  it('keeps a meal the user has, and uses the default meal otherwise', () => {
    const items = toConfirmItems(resolve([{ name: 'egg', slot: 'breakfast' }, { name: 'roti' }, { name: 'dal', slot: 'brunch' }]), 'snack', SLOTS);
    expect(items.map((i) => i.slot)).toEqual(['breakfast', 'snack', 'snack']);
    expect(items.map((i) => i.key)).toEqual(['item-0', 'item-1', 'item-2']);
  });

  it('shows amounts as text without long decimals', () => {
    const [i] = toConfirmItems(resolve([{ name: 'rice', qty: 'sawa', unit: 'katori' }]), 'lunch', SLOTS);
    expect(i.qtyText).toBe('1.25');
  });
});

describe('splitReady', () => {
  it('splits what can be logged from what needs the user, and ignores unresolved items', () => {
    const items = toConfirmItems(resolve([{ name: 'roti', qty: 2 }, { name: 'xylophone' }]), 'lunch', SLOTS);
    const { ready, pending } = splitReady(items, foods);
    expect(ready).toHaveLength(1);
    expect(ready[0]).toMatchObject({ foodId: 'in-roti', qty: 2, unit: 'piece' });
    expect(ready[0].preview.kcal).toBeCloseTo(237.6, 5); // numbers come from the food table
    expect(pending.map((p) => p.parsed.name)).toEqual(['xylophone']);
  });

  it('keeps an item pending while its amount is not valid, and lets it through once fixed', () => {
    const [item] = toConfirmItems(resolve([{ name: 'roti', qty: 2 }]), 'lunch', SLOTS);
    expect(splitReady([{ ...item, qtyText: '0' }], foods).pending).toHaveLength(1);
    expect(splitReady([{ ...item, qtyText: 'abc' }], foods).pending).toHaveLength(1);
    expect(splitReady([{ ...item, qtyText: '1' }], foods).ready).toHaveLength(1);
  });

  it('ignores any calories the AI might have sent: previews come from the table', () => {
    const [item] = toConfirmItems(resolveItems([{ name: 'samosa', qty: 2, unit: '', slot: '', kcal: 9999 } as never], index, unitMap), 'snack', SLOTS);
    const { ready } = splitReady([item], foods);
    expect(ready[0].preview.grams).toBe(160); // 2 samosa x 80 g
    expect(ready[0].preview.kcal).toBeCloseTo(419.2, 5); // 262 kcal per 100 g, not the 9999 the AI claimed
  });
});

describe('withFood', () => {
  it('switches to an alternative or a picked food, keeping the amount and fixing the unit', () => {
    const [item] = toConfirmItems(resolve([{ name: 'dal', qty: 2, unit: '' }]), 'lunch', SLOTS);
    expect(item.foodId).toBe('in-dal');
    const alt = foods.get('in-dal-makhani')!;
    const next = withFood(item, alt);
    expect(next).toMatchObject({ foodId: 'in-dal-makhani', qtyText: '2', unit: 'katori', matchKind: 'exact' });
    expect(next.alternatives.map((a) => a.foodId)).not.toContain('in-dal-makhani');
  });

  it('resolves a Not found item once a food is picked', () => {
    const [item] = toConfirmItems(resolve([{ name: 'xylophone steak', qty: 1, unit: 'g' }]), 'lunch', SLOTS);
    expect(item.foodId).toBeNull();
    const next = withFood(item, foods.get('usda-beef-tenderloin')!);
    expect(next).toMatchObject({ foodId: 'usda-beef-tenderloin', unit: 'g' });
    expect(splitReady([next], foods).ready).toHaveLength(1);
  });
});
