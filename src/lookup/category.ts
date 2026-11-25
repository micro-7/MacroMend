import type { FoodCategory } from '../core/diet';

const NON_VEG = /\b(chicken|mutton|lamb|goat|beef|pork|ham|bacon|sausage|salami|turkey|duck|fish|salmon|tuna|sardine|anchov|prawn|shrimp|crab|lobster|squid|meat|biryani gosht|kebab|keema)\b/i;
const EGG = /\b(eggs?|omelet+e?|anda)\b/i;
const DAIRY = /\b(milk|cheese|paneer|curd|dahi|yogurt|yoghurt|ghee|butter|cream|whey|lassi|kheer|khoya|mawa|ice cream)\b/i;
const VEGAN = /\b(tofu|soya|soy|oat milk|almond milk|hummus|vegan)\b/i;

/** A best guess at the diet category from the name alone. Null when it cannot tell. */
export function guessCategoryFromName(name: string): FoodCategory | null {
  if (NON_VEG.test(name)) return 'non-veg';
  if (EGG.test(name)) return 'egg';
  if (VEGAN.test(name)) return 'vegan';
  if (DAIRY.test(name)) return 'veg';
  return null;
}

/**
 * Category from Open Food Facts' own tags (ingredient analysis and labels), falling back to the name.
 * "Maybe vegetarian" and "unknown" are not trusted.
 */
export function guessCategoryFromTags(tags: string[], name: string): FoodCategory | null {
  const has = (t: string) => tags.includes(t);
  if (has('en:non-vegetarian')) return guessCategoryFromName(name) === 'egg' ? 'egg' : 'non-veg';
  if (has('en:vegan')) return 'vegan';
  if (has('en:vegetarian')) return EGG.test(name) ? 'egg' : 'veg';
  return guessCategoryFromName(name);
}
