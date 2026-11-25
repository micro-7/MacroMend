import { GLOBAL_FOODS } from './global';
import { INDIAN_FOODS } from './indian';
import type { FoodSeed } from './types';
import { USDA_FOODS } from './usda';

/** Bump whenever any bundled food row changes so installs re-seed. */
export const CATALOG_VERSION = 3;

export const ALL_FOODS: FoodSeed[] = [...INDIAN_FOODS, ...USDA_FOODS, ...GLOBAL_FOODS];

export { GLOBAL_FOODS, INDIAN_FOODS, USDA_FOODS };
export type { FoodCategory, FoodSeed, FoodSource } from './types';
