import { getIngredientById } from './ingredients';
import { getMeatCatalogEntry } from './meatCatalog';
import { macrosFromPer100g, roundNutrition } from '../foodLogUtils';
import type { NutritionTotals } from '../types';

export type DishComponent =
  | { type: 'ingredient'; id: string; grams: number }
  | { type: 'meat'; id: string; grams: number };

export type DishEntry = {
  id: string;
  label: string;
  keys: string[];
  defaultServingG: number;
  components: DishComponent[];
};

/** Món Việt phổ biến = tổng macro thành phần. */
export const DISH_CATALOG: DishEntry[] = [
  {
    id: 'pho-bo',
    label: 'Phở bò (1 tô)',
    keys: ['phở bò', 'pho bo', 'phở tái', 'pho tai'],
    defaultServingG: 500,
    components: [
      { type: 'ingredient', id: 'pho-noodles', grams: 450 },
      { type: 'meat', id: 'beef-lean', grams: 80 },
      { type: 'ingredient', id: 'vegetable', grams: 40 },
    ],
  },
  {
    id: 'bun-bo-hue',
    label: 'Bún bò Huế (1 tô)',
    keys: ['bún bò', 'bun bo', 'bún bò huế', 'bun bo hue'],
    defaultServingG: 500,
    components: [
      { type: 'ingredient', id: 'noodle', grams: 200 },
      { type: 'ingredient', id: 'bun-bo-broth', grams: 350 },
      { type: 'meat', id: 'beef-brisket', grams: 70 },
    ],
  },
  {
    id: 'com-tam',
    label: 'Cơm tấm (1 dĩa)',
    keys: ['cơm tấm', 'com tam', 'cơm sườn', 'com suon'],
    defaultServingG: 450,
    components: [
      { type: 'ingredient', id: 'rice-white', grams: 220 },
      { type: 'meat', id: 'pork-ribs', grams: 120 },
      { type: 'ingredient', id: 'vegetable', grams: 60 },
      { type: 'ingredient', id: 'egg', grams: 50 },
    ],
  },
  {
    id: 'bun-cha',
    label: 'Bún chả (1 suất)',
    keys: ['bún chả', 'bun cha'],
    defaultServingG: 450,
    components: [
      { type: 'ingredient', id: 'noodle', grams: 180 },
      { type: 'meat', id: 'pork-generic', grams: 100 },
      { type: 'ingredient', id: 'vegetable', grams: 80 },
    ],
  },
  {
    id: 'banh-mi-thit',
    label: 'Bánh mì thịt',
    keys: ['bánh mì thịt', 'banh mi thit', 'bánh mì sài gòn'],
    defaultServingG: 200,
    components: [
      { type: 'ingredient', id: 'bread', grams: 90 },
      { type: 'meat', id: 'pork-generic', grams: 60 },
      { type: 'ingredient', id: 'vegetable', grams: 30 },
    ],
  },
  {
    id: 'goi-cuon',
    label: 'Gỏi cuốn (2 cuốn)',
    keys: ['gỏi cuốn', 'goi cuon', 'cuốn'],
    defaultServingG: 160,
    components: [
      { type: 'ingredient', id: 'spring-roll-wrapper', grams: 40 },
      { type: 'meat', id: 'seafood-shrimp', grams: 40 },
      { type: 'ingredient', id: 'vegetable', grams: 60 },
    ],
  },
  {
    id: 'xoi',
    label: 'Xôi (1 phần)',
    keys: ['xôi', 'xoi ', 'xôi gà', 'xoi ga'],
    defaultServingG: 250,
    components: [
      { type: 'ingredient', id: 'rice-white', grams: 200 },
      { type: 'meat', id: 'chicken-generic', grams: 60 },
    ],
  },
];

function componentMacros(c: DishComponent): NutritionTotals | null {
  if (c.type === 'ingredient') {
    const ing = getIngredientById(c.id);
    if (!ing) return null;
    return macrosFromPer100g(ing.per100g, c.grams);
  }
  const meat = getMeatCatalogEntry(c.id);
  if (!meat) return null;
  return macrosFromPer100g(meat.per100g, c.grams);
}

export function macrosForDish(dish: DishEntry, scale = 1): NutritionTotals {
  let total: NutritionTotals = { pro: 0, carb: 0, fat: 0, cal: 0 };
  for (const c of dish.components) {
    const part = componentMacros(c);
    if (!part) continue;
    total = {
      pro: total.pro + part.pro * scale,
      carb: total.carb + part.carb * scale,
      fat: total.fat + part.fat * scale,
      cal: total.cal + part.cal * scale,
    };
  }
  return roundNutrition(total);
}

export function matchDish(text: string): DishEntry | null {
  const n = text.toLowerCase().trim();
  let best: DishEntry | null = null;
  let bestLen = 0;
  for (const dish of DISH_CATALOG) {
    for (const key of dish.keys) {
      if (n.includes(key) && key.length > bestLen) {
        best = dish;
        bestLen = key.length;
      }
    }
  }
  return best;
}
