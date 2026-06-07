import { ensureMacroFat } from '../foodLogUtils';
import type { MeatCatalogEntry, MeatCatalogGroup } from '../types';

const RAW_MEAT: Omit<MeatCatalogEntry, 'per100g'> & { per100g: Omit<MeatCatalogEntry['per100g'], 'fat'> & { fat?: number } }[] = [
  { id: 'chicken-breast', label: 'Ức gà (không da)', hint: '31g đạm · 165 kcal / 100g', per100g: { pro: 31, carb: 0, cal: 165, fat: 3.6 }, defaultServingG: 120, keys: ['ức gà', 'uc ga', 'gà ức', 'ga uc', 'chicken breast'] },
  { id: 'chicken-thigh', label: 'Đùi gà (có da)', hint: '18g đạm · 209 kcal / 100g', per100g: { pro: 18, carb: 0, cal: 209, fat: 15 }, defaultServingG: 100, keys: ['đùi gà', 'dui ga', 'gà đùi', 'ga dui', 'chicken thigh'] },
  { id: 'chicken-wing', label: 'Cánh gà', hint: '23g đạm · 203 kcal / 100g', per100g: { pro: 23, carb: 0, cal: 203, fat: 12 }, defaultServingG: 80, keys: ['cánh gà', 'canh ga', 'gà cánh', 'chicken wing'] },
  { id: 'chicken-ground', label: 'Thịt gà xay', hint: '17g đạm · 189 kcal / 100g', per100g: { pro: 17, carb: 0, cal: 189, fat: 11 }, defaultServingG: 120, keys: ['gà xay', 'ga xay', 'thịt gà xay', 'thit ga xay'] },
  { id: 'chicken-generic', label: 'Thịt gà (trung bình)', hint: '27g đạm · 190 kcal / 100g', per100g: { pro: 27, carb: 0, cal: 190, fat: 7 }, defaultServingG: 120, keys: ['thịt gà', 'thit ga', 'gà luộc', 'ga luoc', 'gà nướng', 'ga nuong', 'chicken'] },
  { id: 'pork-lean', label: 'Heo nạc (thịt nạc)', hint: '27g đạm · 198 kcal / 100g', per100g: { pro: 27, carb: 0, cal: 198, fat: 7 }, defaultServingG: 120, keys: ['heo nạc', 'heo nac', 'thịt heo nạc', 'thit heo nac', 'lợn nạc', 'lon nac'] },
  { id: 'pork-shoulder', label: 'Vai / cổ heo', hint: '17g đạm · 248 kcal / 100g', per100g: { pro: 17, carb: 0, cal: 248, fat: 18 }, defaultServingG: 120, keys: ['vai heo', 'cổ heo', 'co heo', 'thịt vai heo'] },
  { id: 'pork-belly', label: 'Ba chỉ heo', hint: '9g đạm · 518 kcal / 100g', per100g: { pro: 9, carb: 0, cal: 518, fat: 53 }, defaultServingG: 80, keys: ['ba chỉ', 'ba chi', 'thịt ba chỉ', 'thit ba chi'] },
  { id: 'pork-ribs', label: 'Sườn heo', hint: '20g đạm · 290 kcal / 100g', per100g: { pro: 20, carb: 0, cal: 290, fat: 22 }, defaultServingG: 150, keys: ['sườn heo', 'suon heo', 'sườn non', 'suon non'] },
  { id: 'pork-generic', label: 'Thịt heo (trung bình)', hint: '27g đạm · 242 kcal / 100g', per100g: { pro: 27, carb: 0, cal: 242, fat: 14 }, defaultServingG: 120, keys: ['thịt heo', 'thit heo', 'heo', ' lợn', 'lon ', 'lợn', 'pork'] },
  { id: 'beef-lean', label: 'Bò nạc (thăn)', hint: '26g đạm · 250 kcal / 100g', per100g: { pro: 26, carb: 0, cal: 250, fat: 10 }, defaultServingG: 150, keys: ['bò nạc', 'bo nac', 'thăn bò', 'than bo', 'thịt bò nạc', 'beef lean', 'steak'] },
  { id: 'beef-brisket', label: 'Bò bắp / nạm', hint: '21g đạm · 280 kcal / 100g', per100g: { pro: 21, carb: 0, cal: 280, fat: 19 }, defaultServingG: 150, keys: ['bò bắp', 'bo bap', 'nạm bò', 'nam bo', 'bắp bò'] },
  { id: 'beef-ground', label: 'Bò xay', hint: '26g đạm · 254 kcal / 100g', per100g: { pro: 26, carb: 0, cal: 254, fat: 15 }, defaultServingG: 120, keys: ['bò xay', 'bo xay', 'thịt bò xay', 'thit bo xay'] },
  { id: 'beef-generic', label: 'Thịt bò (trung bình)', hint: '26g đạm · 250 kcal / 100g', per100g: { pro: 26, carb: 0, cal: 250, fat: 12 }, defaultServingG: 150, keys: ['thịt bò', 'thit bo', 'bò', ' bo ', 'beef', 'bít tết', 'bit tet'] },
  { id: 'duck', label: 'Vịt', hint: '19g đạm · 337 kcal / 100g', per100g: { pro: 19, carb: 0, cal: 337, fat: 28 }, defaultServingG: 130, keys: ['vịt', 'vit ', 'thịt vịt', 'duck'] },
  { id: 'lamb', label: 'Cừu', hint: '25g đạm · 294 kcal / 100g', per100g: { pro: 25, carb: 0, cal: 294, fat: 21 }, defaultServingG: 130, keys: ['cừu', 'cuu ', 'thịt cừu', 'lamb'] },
  { id: 'fish-basa', label: 'Cá basa / cá tra', hint: '15g đạm · 90 kcal / 100g', per100g: { pro: 15, carb: 0, cal: 90, fat: 2 }, defaultServingG: 150, keys: ['cá basa', 'ca basa', 'cá tra', 'ca tra', 'basa'] },
  { id: 'fish-salmon', label: 'Cá hồi', hint: '20g đạm · 208 kcal / 100g', per100g: { pro: 20, carb: 0, cal: 208, fat: 13 }, defaultServingG: 150, keys: ['cá hồi', 'ca hoi', 'hồi', 'salmon'] },
  { id: 'fish-generic', label: 'Cá fillet (trung bình)', hint: '20g đạm · 130 kcal / 100g', per100g: { pro: 20, carb: 0, cal: 130, fat: 4 }, defaultServingG: 150, keys: ['cá', ' ca ', 'cá thu', 'ca thu', 'cá ngừ', 'fish'] },
  { id: 'seafood-shrimp', label: 'Tôm', hint: '24g đạm · 99 kcal / 100g', per100g: { pro: 24, carb: 0, cal: 99, fat: 1 }, defaultServingG: 100, keys: ['tôm', 'tom ', 'shrimp'] },
  { id: 'seafood-squid', label: 'Mực', hint: '18g đạm · 92 kcal / 100g', per100g: { pro: 18, carb: 0, cal: 92, fat: 1 }, defaultServingG: 120, keys: ['mực', 'muc ', 'squid'] },
];

export const MEAT_CATALOG: MeatCatalogEntry[] = RAW_MEAT.map((e) => ({
  ...e,
  per100g: ensureMacroFat(e.per100g),
}));

export const MEAT_CATALOG_GROUPS: MeatCatalogGroup[] = [
  { title: 'Gà', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('chicken')) },
  { title: 'Heo / lợn', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('pork')) },
  { title: 'Bò', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('beef')) },
  {
    title: 'Cá & hải sản',
    entries: MEAT_CATALOG.filter((e) => e.id.startsWith('fish') || e.id.startsWith('seafood')),
  },
  { title: 'Khác', entries: MEAT_CATALOG.filter((e) => e.id.startsWith('duck') || e.id.startsWith('lamb')) },
];

export function getMeatCatalogEntry(meatId: string): MeatCatalogEntry | undefined {
  return MEAT_CATALOG.find((e) => e.id === meatId);
}
