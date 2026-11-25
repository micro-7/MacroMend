import { ALL_FOODS } from '../../data/foods';
import {
  bestProteinQty, closestQtyTo, largestQtyWithin, mulberry32, openSlotIds, planSignature, qtyOptions,
  rebalance, shufflePlan, stepFor, swapItem,
  type Plan, type RebalanceInput, type StapleInfo,
} from '../rebalance';

function staple(id: string, usualQty?: number): StapleInfo {
  const f = ALL_FOODS.find((x) => x.id === id);
  if (!f) throw new Error(`missing food ${id}`);
  return {
    foodId: f.id, name: f.name, category: f.category, unit: f.unit, gramsPerUnit: f.gramsPerUnit,
    kcalPer100g: f.kcalPer100g, proteinPer100g: f.proteinPer100g,
    usualQty: usualQty ?? (f.unit === 'g' ? 100 : 1),
  };
}

const paneer = staple('in-paneer');
const whey = staple('in-whey');
const roti = staple('in-roti', 2);
const rice = staple('in-rice');
const chicken = staple('usda-chicken-breast');

const input = (over: Partial<RebalanceInput> = {}): RebalanceInput => ({
  remainingKcal: 900, remainingProteinG: 70, openSlotIds: ['snack', 'dinner'],
  staples: [paneer, whey, roti, rice], dietType: 'veg', seed: 1, ...over,
});

const names = (p: Plan) => p.slots.flatMap((s) => s.items.map((i) => i.name));

describe('portion steps', () => {
  it('uses whole units for roti and scoops, and 25 g steps from 50 g for gram foods', () => {
    expect(stepFor(roti)).toEqual({ step: 1, min: 1 });
    expect(stepFor(whey)).toEqual({ step: 1, min: 1 });
    expect(stepFor(paneer)).toEqual({ step: 25, min: 50 });
  });

  it('lists portions up to twice the usual quantity', () => {
    expect(qtyOptions(roti)).toEqual([1, 2, 3, 4]);
    expect(qtyOptions(whey)).toEqual([1, 2]);
    expect(qtyOptions(paneer)).toEqual([50, 75, 100, 125, 150, 175, 200]);
  });

  it('never goes below one step, even for a tiny usual quantity', () => {
    expect(qtyOptions({ ...whey, usualQty: 0.5 })).toEqual([1]);
    expect(qtyOptions({ ...paneer, usualQty: 20 })).toEqual([50]);
  });

  it('picks the smallest portion that reaches the protein goal and fits', () => {
    expect(bestProteinQty(whey, 30, 500)).toBe(2); // 1 scoop = 24 g, 2 scoops = 48 g
    expect(bestProteinQty(whey, 20, 500)).toBe(1);
    expect(bestProteinQty(paneer, 20, 500)).toBe(125); // 100 g = 18.3 g, 125 g = 22.9 g
  });

  it('falls back to the largest portion that fits, or null when nothing fits', () => {
    expect(bestProteinQty(paneer, 80, 400)).toBe(150); // 150 g = 397 kcal
    expect(bestProteinQty(whey, 30, 100)).toBeNull(); // one scoop is 120 kcal
  });

  it('finds the largest portion within a budget and the one closest to a target', () => {
    expect(largestQtyWithin(roti, 300)).toBe(2); // 2 roti = 238, 3 = 356
    expect(largestQtyWithin(roti, 100)).toBeNull();
    expect(closestQtyTo(roti, 240, 500)).toBe(2);
    expect(closestQtyTo(roti, 330, 500)).toBe(3);
  });
});

describe('rebalance: which slots', () => {
  it('suggests only for open slots (Breakfast and Lunch already logged)', () => {
    const slots = [{ id: 'breakfast' }, { id: 'lunch' }, { id: 'snack' }, { id: 'dinner' }];
    const open = openSlotIds(slots, [{ slot: 'breakfast' }, { slot: 'lunch' }]);
    expect(open).toEqual(['snack', 'dinner']);
    expect(rebalance(input({ openSlotIds: open })).slots.map((s) => s.slotId)).toEqual(['snack', 'dinner']);
  });
});

describe('rebalance: diet', () => {
  it('never suggests chicken to a vegetarian, whatever the seed', () => {
    for (let seed = 0; seed < 40; seed++) {
      const p = rebalance(input({ staples: [paneer, whey, roti, rice, chicken], seed }));
      expect(names(p)).not.toContain('chicken breast');
    }
  });

  it('can suggest chicken to a non-vegetarian', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      rebalance(input({ staples: [chicken, roti, rice], dietType: 'non-veg', seed })).slots.forEach((s) => s.items.forEach((i) => seen.add(i.name)));
    }
    expect(seen.has('chicken breast')).toBe(true);
  });
});

describe('rebalance: protein first, then calories', () => {
  it('gives each slot a protein food and stays within the calories (900 kcal, 70 g, two slots)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = rebalance(input({ seed }));
      expect(p.reason).toBeNull();
      for (const s of p.slots) expect(s.items.some((i) => i.role === 'protein')).toBe(true);
      expect(p.totalKcal).toBeLessThanOrEqual(900 + 1e-6);
      expect(p.totalProteinG).toBeGreaterThan(50);
      expect(p.totalProteinG).toBeLessThanOrEqual(70 + 30);
    }
  });

  it('adds carb foods to use the rest of the calories', () => {
    const p = rebalance(input());
    expect(p.slots.every((s) => s.items.some((i) => i.role === 'carb'))).toBe(true);
    expect(p.totalKcal).toBeGreaterThan(600);
  });

  it('when calories are too tight, stays under them, uses the most protein-dense food and reports the gap', () => {
    const p = rebalance(input({ remainingKcal: 200, remainingProteinG: 60 }));
    expect(p.totalKcal).toBeLessThanOrEqual(200 + 1e-6);
    expect(names(p)).toContain('whey protein');
    expect(p.proteinShortByG).toBeGreaterThan(0);
    expect(p.proteinShortByG).toBeCloseTo(60 - p.totalProteinG, 6);
  });

  it('can add a second protein food when protein is far short and calories allow', () => {
    const p = rebalance(input({ remainingKcal: 1500, remainingProteinG: 150, openSlotIds: ['dinner'] }));
    expect(p.slots[0].items.filter((i) => i.role === 'protein').length).toBeGreaterThanOrEqual(2);
    expect(p.totalKcal).toBeLessThanOrEqual(1500 + 1e-6);
  });
});

describe('rebalance: real portions', () => {
  it('uses whole roti and scoops, and 25 g steps for paneer, never above twice the usual amount', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = rebalance(input({ seed, remainingKcal: 1200, remainingProteinG: 90 }));
      for (const i of p.slots.flatMap((s) => s.items)) {
        if (i.name === 'roti') {
          expect(Number.isInteger(i.qty)).toBe(true);
          expect(i.qty).toBeLessThanOrEqual(4);
        }
        if (i.name === 'whey protein') {
          expect(Number.isInteger(i.qty)).toBe(true);
          expect(i.qty).toBeLessThanOrEqual(2);
        }
        if (i.name === 'paneer') {
          expect(i.qty % 25).toBe(0);
          expect(i.qty).toBeGreaterThanOrEqual(50);
          expect(i.qty).toBeLessThanOrEqual(200);
        }
      }
    }
  });
});

describe('rebalance: nothing to fix', () => {
  it('says so when no slot is open', () => {
    const p = rebalance(input({ openSlotIds: [] }));
    expect(p.reason).toBe('no_open_slots');
    expect(p.slots).toEqual([]);
  });

  it('says the kcal target is reached when nothing is left', () => {
    const p = rebalance(input({ remainingKcal: 0 }));
    expect(p.reason).toBe('kcal_reached');
    expect(names(p)).toEqual([]);
  });

  it('asks for a protein staple when the user has none that is allowed', () => {
    expect(rebalance(input({ staples: [roti, rice] })).reason).toBe('no_protein_staple');
    // chicken is the only protein food but the user is vegetarian
    expect(rebalance(input({ staples: [chicken, roti] })).reason).toBe('no_protein_staple');
  });

  it('reports too few calories when not even the smallest portion fits', () => {
    const p = rebalance(input({ remainingKcal: 40, remainingProteinG: 30 }));
    expect(p.reason).toBe('too_few_kcal');
    expect(p.totalKcal).toBe(0);
  });

  it('never suggests oils, ghee or sugar as a meal', () => {
    const p = rebalance(input({ staples: [paneer, roti, staple('in-ghee'), staple('in-oil'), staple('usda-sugar')], seed: 3 }));
    expect(names(p).some((n) => ['ghee', 'cooking oil', 'sugar'].includes(n))).toBe(false);
  });
});

describe('rebalance: determinism and the calorie budget', () => {
  it('gives the same plan for the same seed and inputs', () => {
    expect(planSignature(rebalance(input({ seed: 7 })))).toBe(planSignature(rebalance(input({ seed: 7 }))));
  });

  it('does not depend on the order staples are listed in', () => {
    const a = rebalance(input({ staples: [paneer, whey, roti, rice] }));
    const b = rebalance(input({ staples: [rice, roti, whey, paneer] }));
    expect(planSignature(a)).toBe(planSignature(b));
  });

  it('never exceeds the remaining calories across 200 random inputs', () => {
    const rng = mulberry32(2026);
    const pool = ALL_FOODS.filter((f) => f.id.startsWith('in-') || f.id.startsWith('usda-')).map((f) => staple(f.id));
    const diets = ['veg', 'eggetarian', 'non-veg', 'vegan'] as const;
    for (let n = 0; n < 200; n++) {
      const count = 3 + Math.floor(rng() * 10);
      const staples = Array.from({ length: count }, () => pool[Math.floor(rng() * pool.length)]);
      const slotCount = 1 + Math.floor(rng() * 5);
      const inp: RebalanceInput = {
        remainingKcal: Math.round(rng() * 2500), remainingProteinG: Math.round(rng() * 160),
        openSlotIds: Array.from({ length: slotCount }, (_, i) => `s${i}`),
        staples, dietType: diets[Math.floor(rng() * 4)], seed: Math.floor(rng() * 1000),
      };
      const p = rebalance(inp);
      expect(p.totalKcal).toBeLessThanOrEqual(inp.remainingKcal + 1e-6);
      for (const i of p.slots.flatMap((s) => s.items)) {
        const s = staples.find((x) => x.foodId === i.foodId)!;
        expect(qtyOptions(s)).toContain(i.qty);
      }
    }
  });
});

describe('swapItem', () => {
  it('replaces paneer with another protein food and recomputes the slot totals', () => {
    let swapped: Plan | null = null;
    let original: Plan | null = null;
    for (let seed = 0; seed < 30 && !swapped; seed++) {
      const inp = input({ seed });
      const p = rebalance(inp);
      const idx = p.slots[0].items.findIndex((i) => i.name === 'paneer');
      if (idx >= 0) {
        original = p;
        swapped = swapItem(inp, p, p.slots[0].slotId, idx);
      }
    }
    expect(swapped).not.toBeNull();
    const before = original!.slots[0];
    const after = swapped!.slots[0];
    const replaced = after.items.find((i) => !before.items.some((b) => b.foodId === i.foodId))!;
    expect(replaced.role).toBe('protein');
    expect(replaced.name).toBe('whey protein');
    expect(after.kcal).toBeCloseTo(after.items.reduce((s, i) => s + i.kcal, 0), 9);
    expect(swapped!.totalKcal).toBeCloseTo(swapped!.slots.reduce((s, x) => s + x.kcal, 0), 9);
    expect(swapped!.totalKcal).toBeLessThanOrEqual(900 + 1e-6);
  });

  it('keeps the same kind (carb stays carb) and avoids foods already in the slot', () => {
    const inp = input({ staples: [paneer, whey, roti, rice, staple('in-poha')], remainingKcal: 1400 });
    const p = rebalance(inp);
    const slot = p.slots[0];
    const idx = slot.items.findIndex((i) => i.role === 'carb');
    const swapped = swapItem(inp, p, slot.slotId, idx)!;
    expect(swapped).not.toBeNull();
    expect(swapped.slots[0].items[idx].role).toBe('carb');
    expect(swapped.slots[0].items[idx].foodId).not.toBe(slot.items[idx].foodId);
    const ids = swapped.slots[0].items.map((i) => i.foodId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns null when there is no other food of that kind to swap in', () => {
    const inp = input({ staples: [paneer, roti] });
    const p = rebalance(inp);
    const idx = p.slots[0].items.findIndex((i) => i.role === 'protein');
    expect(swapItem(inp, p, p.slots[0].slotId, idx)).toBeNull();
    expect(swapItem(inp, p, 'nope', 0)).toBeNull();
    expect(swapItem(inp, p, p.slots[0].slotId, 99)).toBeNull();
  });
});

describe('shufflePlan', () => {
  it('shows a different arrangement when there are two or more protein foods', () => {
    const inp = input();
    const current = rebalance(inp);
    const { plan, seed } = shufflePlan(inp, current);
    expect(planSignature(plan)).not.toBe(planSignature(current));
    expect(seed).not.toBe(inp.seed);
    expect(plan.totalKcal).toBeLessThanOrEqual(900 + 1e-6);
  });

  it('keeps the plan when only one arrangement is possible', () => {
    const inp = input({ staples: [paneer], openSlotIds: ['dinner'] });
    const current = rebalance(inp);
    expect(shufflePlan(inp, current).plan).toBe(current);
  });
});
