import type { FoodEstimateResult, NutritionTotals } from '../lib/dashboardStorage';
import { tezcaTheme } from '../lib/tezcaTheme';

type Props = {
  result: Extract<FoodEstimateResult, { kind: 'confirm' }>;
  onConfirm: (macros: NutritionTotals, displayName: string) => void;
  onCancel: () => void;
};

export function FoodConfirmPanel({ result, onConfirm, onCancel }: Props) {
  const pct = Math.round(result.confidence * 100);

  return (
    <div
      className="mb-4 rounded-xl border p-3 space-y-3 tezca-animate-fade-in"
      style={{ borderColor: 'rgba(59, 130, 246, 0.45)', backgroundColor: 'rgba(219, 234, 254, 0.4)' }}
      role="dialog"
      aria-label="Xác nhận dinh dưỡng"
    >
      <p className="text-sm font-semibold m-0" style={{ color: '#1e3a5f' }}>
        Xác nhận &ldquo;{result.input}&rdquo;
      </p>
      <p className="text-[11px] m-0 opacity-90" style={{ color: '#1e3a5f' }}>
        {result.reason} · Độ tin cậy ~{pct}%
      </p>
      <div className="flex flex-wrap gap-3 text-xs font-medium">
        <span className="text-blue-700">{result.macros.pro}g đạm</span>
        <span className="text-orange-700">{result.macros.carb}g carb</span>
        <span className="text-amber-800">{result.macros.fat}g béo</span>
        <span className="text-emerald-700 font-bold">{result.macros.cal} kcal</span>
        {result.grams > 0 && <span className="opacity-60">~{Math.round(result.grams)}g</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(result.macros, result.displayName)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold border-0 cursor-pointer text-black"
          style={{ background: tezcaTheme.accentGradient }}
        >
          Lưu món
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm font-medium border cursor-pointer bg-transparent"
          style={{ borderColor: tezcaTheme.border, color: tezcaTheme.text }}
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
