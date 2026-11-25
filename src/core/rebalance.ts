import { isAllowed, type DietType, type FoodCategory } from './diet';
import { isProteinFood } from './foodRole';
import { isGramUnit } from './staples';

export interface StapleInfo {
  foodId: string;
  name: string;
  category: FoodCategory;
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  proteinPer100g: number;
  /** The user's usual quantity, in `unit`. Suggestions never exceed twice this. */
  usualQty: number;
}

export type Role = 'protein' | 'carb';

export interface PlanItem {
  foodId: string;
  name: string;
  role: Role;
  qty: number;
  unit: string;
  grams: number;
  kcal: number;
  proteinG: number;
}

export interface PlanSlot {
  slotId: string;
  items: PlanItem[];
  kcal: number;
  proteinG: number;
}

export type PlanReason = 'no_open_slots' | 'kcal_reached' | 'no_protein_staple' | 'too_few_kcal';

export interface Plan {
  slots: PlanSlot[];
  totalKcal: number;
  totalProteinG: number;
  /** How much of the remaining protein the plan cannot cover. */
  proteinShortByG: number;
  /** Set when there is nothing to suggest, and why. */
  reason: PlanReason | null;
}

export interface RebalanceInput {
  remainingKcal: number;
  remainingProteinG: number;
  /** Slots with nothing logged today, in the user's order. */
  openSlotIds: string[];
  staples: StapleInfo[];
  dietType: DietType;
  /** Same seed and inputs always give the same plan. */
  seed: number;
}

const EPS = 1e-6;
/** Only add a second protein food when the plan is at least this many grams short. */
const MIN_PROTEIN_GAP_G = 5;
/** A second protein food may use at most this share of the kcal still unspent. */
const SECOND_PROTEIN_KCAL_SHARE = 0.6;

// ---------- small helpers ----------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const byId = (a: StapleInfo, b: StapleInfo) => (a.foodId < b.foodId ? -1 : a.foodId > b.foodId ? 1 : 0);
const rotate = <T,>(a: T[], by: number): T[] => (a.length === 0 ? a : a.map((_, i) => a[(i + by) % a.length]));
const density = (s: StapleInfo) => (s.kcalPer100g > 0 ? s.proteinPer100g / s.kcalPer100g : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- portions ----------

/** Gram foods move in 25 g steps from 50 g; everything else in whole units from 1. */
export function stepFor(s: Pick<StapleInfo, 'unit'>): { step: number; min: number } {
  return isGramUnit(s.unit) ? { step: 25, min: 50 } : { step: 1, min: 1 };
}

/** Every quantity we may suggest for a staple: from the minimum to twice the usual quantity (never below one step). */
export function qtyOptions(s: StapleInfo): number[] {
  const { step, min } = stepFor(s);
  const cap = Math.max(min, Math.floor((2 * s.usualQty) / step + EPS) * step);
  const out: number[] = [];
  for (let q = min; q <= cap + EPS; q += step) out.push(round2(q));
  return out;
}

function nutritionFor(s: StapleInfo, qty: number) {
  const grams = qty * s.gramsPerUnit;
  return { grams, kcal: (grams * s.kcalPer100g) / 100, proteinG: (grams * s.proteinPer100g) / 100 };
}

function itemFor(s: StapleInfo, qty: number, role: Role): PlanItem {
  return { foodId: s.foodId, name: s.name, role, qty, unit: s.unit, ...nutritionFor(s, qty) };
}

/**
 * Smallest portion that reaches `goalProtein` and fits `budgetKcal`; if none reaches it, the largest
 * portion that fits (most protein we can get). Null when even the smallest portion is too big.
 */
export function bestProteinQty(s: StapleInfo, goalProtein: number, budgetKcal: number): number | null {
  const fits = qtyOptions(s).filter((q) => nutritionFor(s, q).kcal <= budgetKcal + EPS);
  if (fits.length === 0) return null;
  const reaching = fits.find((q) => nutritionFor(s, q).proteinG >= goalProtein - EPS);
  return reaching ?? fits[fits.length - 1];
}

/** Largest portion that fits `budgetKcal`, or null. */
export function largestQtyWithin(s: StapleInfo, budgetKcal: number): number | null {
  const fits = qtyOptions(s).filter((q) => nutritionFor(s, q).kcal <= budgetKcal + EPS);
  return fits.length === 0 ? null : fits[fits.length - 1];
}

/** Portion closest to `targetKcal` among those that fit `budgetKcal`, or null. */
export function closestQtyTo(s: StapleInfo, targetKcal: number, budgetKcal: number): number | null {
  const fits = qtyOptions(s).filter((q) => nutritionFor(s, q).kcal <= budgetKcal + EPS);
  if (fits.length === 0) return null;
  return fits.reduce((best, q) =>
    Math.abs(nutritionFor(s, q).kcal - targetKcal) < Math.abs(nutritionFor(s, best).kcal - targetKcal) ? q : best,
  );
}

// ---------- which staples may be suggested ----------

/** Oils, ghee, nuts, sugar and similar are not meals, so they are never suggested on their own. */
export function isMealFood(s: Pick<StapleInfo, 'kcalPer100g' | 'proteinPer100g'>): boolean {
  if (s.kcalPer100g > 500) return false;
  if (s.proteinPer100g < 0.5 && s.kcalPer100g > 300) return false;
  return true;
}

export function eligibleStaples(staples: StapleInfo[], diet: DietType): { protein: StapleInfo[]; carb: StapleInfo[] } {
  const ok = staples.filter((s) => isAllowed(s, diet) && isMealFood(s)).sort(byId);
  return { protein: ok.filter(isProteinFood), carb: ok.filter((s) => !isProteinFood(s)) };
}

// ---------- plan assembly ----------

function makeSlot(slotId: string, items: PlanItem[]): PlanSlot {
  return {
    slotId,
    items,
    kcal: items.reduce((s, i) => s + i.kcal, 0),
    proteinG: items.reduce((s, i) => s + i.proteinG, 0),
  };
}

function makePlan(input: RebalanceInput, slots: PlanSlot[], reason: PlanReason | null): Plan {
  const totalKcal = slots.reduce((s, x) => s + x.kcal, 0);
  const totalProteinG = slots.reduce((s, x) => s + x.proteinG, 0);
  const nothing = slots.every((s) => s.items.length === 0);
  return {
    slots,
    totalKcal,
    totalProteinG,
    proteinShortByG: Math.max(0, input.remainingProteinG - totalProteinG),
    reason: reason ?? (nothing ? 'too_few_kcal' : null),
  };
}

function emptyPlan(input: RebalanceInput, reason: PlanReason): Plan {
  return makePlan(input, input.openSlotIds.map((id) => makeSlot(id, [])), reason);
}

function pickProtein(
  order: StapleInfo[],
  exclude: Set<string>,
  goalProtein: number,
  budgetKcal: number,
  tight: boolean,
): PlanItem | null {
  // When calories are tight, the most protein-dense foods go first; otherwise follow the seeded rotation.
  const candidates = tight ? order.slice().sort((a, b) => density(b) - density(a)) : order;
  for (const c of candidates) {
    if (exclude.has(c.foodId)) continue;
    const q = bestProteinQty(c, goalProtein, budgetKcal);
    if (q !== null) return itemFor(c, q, 'protein');
  }
  return null;
}

/**
 * Spread what is left of today across the open slots using the user's own staples:
 * protein foods first, then carb foods for the rest of the calories. Never exceeds `remainingKcal`.
 */
export function rebalance(input: RebalanceInput): Plan {
  const { remainingKcal, remainingProteinG, openSlotIds, staples, dietType, seed } = input;
  if (openSlotIds.length === 0) return emptyPlan(input, 'no_open_slots');
  if (remainingKcal <= EPS) return emptyPlan(input, 'kcal_reached');
  const { protein, carb } = eligibleStaples(staples, dietType);
  if (protein.length === 0) return emptyPlan(input, 'no_protein_staple');

  const rng = mulberry32(seed);
  const proteinOrder = shuffled(protein, rng);
  const carbOrder = shuffled(carb, rng);
  const n = openSlotIds.length;
  const items: PlanItem[][] = openSlotIds.map(() => []);
  const slotKcal = (i: number) => items[i].reduce((s, x) => s + x.kcal, 0);

  let pool = remainingKcal;
  let proteinLeft = remainingProteinG;
  // Calories are tight when protein alone would use most of them.
  const tight = remainingProteinG * 4 > 0.8 * remainingKcal;

  // 1. One protein food per slot, each aiming at an equal share of the protein still needed.
  for (let i = 0; i < n; i++) {
    const budget = pool / (n - i);
    const goal = Math.max(0, proteinLeft) / (n - i);
    const item = pickProtein(rotate(proteinOrder, i), new Set(), goal, budget, tight);
    if (item) {
      items[i].push(item);
      pool -= item.kcal;
      proteinLeft -= item.proteinG;
    }
  }

  // 2. Still well short of protein and calories left: add a different protein food where the slot is lightest.
  for (let guard = 0; guard < n * 3 && proteinLeft >= MIN_PROTEIN_GAP_G; guard++) {
    let idx = 0;
    for (let i = 1; i < n; i++) if (slotKcal(i) < slotKcal(idx)) idx = i;
    const exclude = new Set(items[idx].map((x) => x.foodId));
    const item = pickProtein(rotate(proteinOrder, idx), exclude, proteinLeft, pool * SECOND_PROTEIN_KCAL_SHARE, tight);
    if (!item) break;
    items[idx].push(item);
    pool -= item.kcal;
    proteinLeft -= item.proteinG;
  }

  // 3. One carb food per slot, using an equal share of the calories that are left.
  for (let i = 0; i < n && carbOrder.length > 0; i++) {
    const budget = pool / (n - i);
    for (const c of rotate(carbOrder, i)) {
      const q = largestQtyWithin(c, budget);
      if (q === null) continue;
      const item = itemFor(c, q, 'carb');
      items[i].push(item);
      pool -= item.kcal;
      break;
    }
  }

  return makePlan(input, openSlotIds.map((id, i) => makeSlot(id, items[i])), null);
}

// ---------- swap and shuffle ----------

/**
 * Replace one suggested food with the next allowed staple of the same kind that is not already in that slot.
 * Returns the new plan, or null when there is nothing to swap in.
 */
export function swapItem(input: RebalanceInput, plan: Plan, slotId: string, index: number): Plan | null {
  const slot = plan.slots.find((s) => s.slotId === slotId);
  const old = slot?.items[index];
  if (!slot || !old) return null;

  const { protein, carb } = eligibleStaples(input.staples, input.dietType);
  const pool = old.role === 'protein' ? protein : carb;
  const start = pool.findIndex((s) => s.foodId === old.foodId);
  const inSlot = new Set(slot.items.map((x) => x.foodId));
  // Calories the new food may use: the old item's plus whatever the plan has not spent yet.
  const budget = old.kcal + Math.max(0, input.remainingKcal - plan.totalKcal);

  for (let k = 1; k <= pool.length; k++) {
    const c = pool[(start + k + pool.length) % pool.length];
    if (inSlot.has(c.foodId)) continue;
    const q = old.role === 'protein' ? bestProteinQty(c, old.proteinG, budget) : closestQtyTo(c, old.kcal, budget);
    if (q === null) continue;
    const slots = plan.slots.map((s) =>
      s.slotId === slotId ? makeSlot(s.slotId, s.items.map((x, i) => (i === index ? itemFor(c, q, old.role) : x))) : s,
    );
    return makePlan(input, slots, null);
  }
  return null;
}

/** A short text that is equal for two plans exactly when they suggest the same foods and portions. */
export function planSignature(plan: Plan): string {
  return plan.slots.map((s) => `${s.slotId}:${s.items.map((i) => `${i.foodId}x${i.qty}`).join('+')}`).join('|');
}

/** Try following seeds until the plan differs from the current one. Keeps the current plan if none does. */
export function shufflePlan(input: RebalanceInput, current: Plan): { plan: Plan; seed: number } {
  const currentSig = planSignature(current);
  for (let k = 1; k <= 25; k++) {
    const seed = input.seed + k;
    const plan = rebalance({ ...input, seed });
    if (planSignature(plan) !== currentSig) return { plan, seed };
  }
  return { plan: current, seed: input.seed };
}

/** Slots that have nothing logged today, in the user's order. */
export function openSlotIds(slots: { id: string }[], logs: { slot: string }[]): string[] {
  const used = new Set(logs.map((l) => l.slot));
  return slots.filter((s) => !used.has(s.id)).map((s) => s.id);
}
