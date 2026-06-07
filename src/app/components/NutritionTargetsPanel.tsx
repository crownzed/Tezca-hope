import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type DailyNutritionTargetsResult,
  type NutritionProfileInput,
} from '../lib/dashboardStorage';
import { tezcaTheme } from '../lib/tezcaTheme';

type Props = {
  profile: NutritionProfileInput;
  onChange: (next: NutritionProfileInput) => void;
  targetsResult: DailyNutritionTargetsResult;
};

export function NutritionTargetsPanel({ profile, onChange, targetsResult }: Props) {
  const [open, setOpen] = useState(false);
  const { targets, warnings, meta } = targetsResult;

  const set = <K extends keyof NutritionProfileInput>(key: K, value: NutritionProfileInput[K]) => {
    onChange({ ...profile, [key]: value });
  };

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100 p-0"
        style={{ color: tezcaTheme.text }}
        aria-expanded={open}
      >
        Mục tiêu dinh dưỡng (BMR/TDEE)
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {!open && (
        <p className="text-[10px] m-0 mt-1 opacity-55">
          {targets.cal} kcal · {targets.pro}g P · {targets.carb}g C · {targets.fat}g F
          {meta.bmr > 0 && ` · BMR ${meta.bmr}`}
        </p>
      )}
      {open && (
        <div
          className="mt-2 rounded-xl border p-3 space-y-2 text-xs"
          style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="opacity-70">Tuổi</span>
              <input
                type="number"
                min={14}
                max={90}
                value={profile.age ?? 30}
                onChange={(e) => set('age', Number(e.target.value) || 30)}
                className="rounded-lg px-2 py-1.5 border text-sm"
                style={{ borderColor: tezcaTheme.border }}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="opacity-70">Giới tính</span>
              <select
                value={profile.sex ?? 'male'}
                onChange={(e) => set('sex', e.target.value as NutritionProfileInput['sex'])}
                className="rounded-lg px-2 py-1.5 border text-sm"
                style={{ borderColor: tezcaTheme.border }}
              >
                {SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-0.5">
            <span className="opacity-70">Mức vận động</span>
            <select
              value={profile.activityLevel ?? 'moderate'}
              onChange={(e) => set('activityLevel', e.target.value as NutritionProfileInput['activityLevel'])}
              className="rounded-lg px-2 py-1.5 border text-sm w-full"
              style={{ borderColor: tezcaTheme.border }}
            >
              {ACTIVITY_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="opacity-70">Mục tiêu</span>
            <select
              value={profile.goal ?? 'maintain'}
              onChange={(e) => set('goal', e.target.value as NutritionProfileInput['goal'])}
              className="rounded-lg px-2 py-1.5 border text-sm w-full"
              style={{ borderColor: tezcaTheme.border }}
            >
              {GOAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <p className="m-0 font-medium opacity-80">
            Mục tiêu: {targets.cal} kcal · P {targets.pro}g · C {targets.carb}g · F {targets.fat}g
          </p>
          {meta.bmr > 0 && (
            <p className="m-0 opacity-60">
              BMR {meta.bmr} · TDEE ~{meta.tdee} kcal
            </p>
          )}
          {warnings.map((w) => (
            <p key={w} className="m-0 text-amber-800 text-[11px]">
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
