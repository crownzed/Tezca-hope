import type { NutritionTotals } from '../types';

export type IngredientEntry = {
  id: string;
  label: string;
  per100g: NutritionTotals;
  defaultServingG: number;
  keys: string[];
};

/** Thực phẩm không-thịt & nguyên liệu cơ bản (USDA / TCVN làm tròn). */
export const INGREDIENT_CATALOG: IngredientEntry[] = [
  { id: 'egg', label: 'Trứng gà', per100g: { pro: 13, carb: 1, fat: 11, cal: 155 }, defaultServingG: 50, keys: ['trứng', 'trung', 'egg'] },
  { id: 'whey', label: 'Whey protein', per100g: { pro: 80, carb: 8, fat: 6, cal: 400 }, defaultServingG: 30, keys: ['whey', 'protein powder'] },
  { id: 'pho-noodles', label: 'Bánh phở / nước dùng phở', per100g: { pro: 6, carb: 12, fat: 2, cal: 95 }, defaultServingG: 500, keys: ['phở', 'pho', 'hủ tiếu', 'hu tieu'] },
  { id: 'rice-white', label: 'Cơm trắng', per100g: { pro: 2.7, carb: 28, fat: 0.3, cal: 130 }, defaultServingG: 200, keys: ['cơm', 'com ', 'cơm trắng', 'rice', 'gạo'] },
  { id: 'bread', label: 'Bánh mì', per100g: { pro: 9, carb: 50, fat: 3, cal: 280 }, defaultServingG: 80, keys: ['bánh mì', 'banh mi', 'bread'] },
  { id: 'noodle', label: 'Mì / bún', per100g: { pro: 5, carb: 25, fat: 1, cal: 140 }, defaultServingG: 250, keys: ['mì', 'mi ', 'pasta', 'noodle', 'bún', 'bun '] },
  { id: 'snack', label: 'Bánh kẹo', per100g: { pro: 6, carb: 45, fat: 14, cal: 350 }, defaultServingG: 60, keys: ['bánh', 'banh ', 'cookie', 'snack', 'kẹo', 'keo'] },
  { id: 'milk', label: 'Sữa / sữa chua', per100g: { pro: 3.4, carb: 5, fat: 3, cal: 60 }, defaultServingG: 250, keys: ['sữa', 'sua ', 'milk', 'yogurt', 'sữa chua'] },
  { id: 'bubble-tea', label: 'Trà sữa', per100g: { pro: 1, carb: 10, fat: 2, cal: 55 }, defaultServingG: 500, keys: ['trà sữa', 'tra sua', 'bubble tea'] },
  { id: 'coffee', label: 'Cà phê', per100g: { pro: 0.5, carb: 3, fat: 0, cal: 20 }, defaultServingG: 300, keys: ['cà phê', 'ca phe', 'coffee'] },
  { id: 'vegetable', label: 'Rau củ', per100g: { pro: 2, carb: 4, fat: 0, cal: 25 }, defaultServingG: 150, keys: ['rau', 'salad', 'rau củ', 'rau cu', 'vegetable'] },
  { id: 'fruit', label: 'Trái cây', per100g: { pro: 1, carb: 14, fat: 0, cal: 60 }, defaultServingG: 120, keys: ['trái cây', 'trai cay', 'chuối', 'chuoi', 'táo', 'tao ', 'fruit'] },
  { id: 'tofu', label: 'Đậu hũ', per100g: { pro: 8, carb: 2, fat: 4, cal: 76 }, defaultServingG: 150, keys: ['đậu', 'dau ', 'đậu hũ', 'dau hu', 'tofu'] },
  { id: 'bun-bo-broth', label: 'Nước dùng bún bò', per100g: { pro: 5, carb: 3, fat: 4, cal: 65 }, defaultServingG: 400, keys: ['nước dùng', 'nuoc dung'] },
  { id: 'pickled', label: 'Dưa chua / đồ chua', per100g: { pro: 1, carb: 6, fat: 0, cal: 30 }, defaultServingG: 50, keys: ['dưa chua', 'dua chua', 'đồ chua'] },
  { id: 'spring-roll-wrapper', label: 'Bánh tráng', per100g: { pro: 2, carb: 72, fat: 0, cal: 330 }, defaultServingG: 40, keys: ['bánh tráng', 'banh trang'] },
];

export function getIngredientById(id: string): IngredientEntry | undefined {
  return INGREDIENT_CATALOG.find((e) => e.id === id);
}
