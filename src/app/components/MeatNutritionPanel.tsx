import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  MEAT_CATALOG_GROUPS,
  type MeatPickOption,
} from '../lib/dashboardStorage';
import { tezcaTheme } from '../lib/tezcaTheme';

type MeatPickProps = {
  input: string;
  grams: number;
  options: MeatPickOption[];
  onSelect: (meatId: string) => void;
  onCancel: () => void;
};

export function MeatTypePicker({ input, grams, options, onSelect, onCancel }: MeatPickProps) {
  return (
    <div
      className="mb-4 rounded-xl border p-3 space-y-2 tezca-animate-fade-in"
      style={{ borderColor: 'rgba(251, 191, 36, 0.5)', backgroundColor: 'rgba(254, 243, 199, 0.35)' }}
      role="dialog"
      aria-label="Chọn loại thịt"
    >
      <p className="text-sm font-semibold m-0" style={{ color: '#78350f' }}>
        Chọn loại thịt cho &ldquo;{input}&rdquo;
        {grams > 0 ? ` (~${Math.round(grams)}g)` : ''}
      </p>
      <p className="text-[11px] m-0 opacity-80" style={{ color: '#78350f' }}>
        Macro tính theo công thức <strong>× (gam ÷ 100)</strong> từ bảng 100g bên dưới.
      </p>
      <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto tezca-dash-scrollbar pr-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className="flex justify-between items-center gap-2 w-full text-left rounded-lg px-3 py-2 border text-sm cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
          >
            <span>
              <span className="font-semibold block">{opt.label}</span>
              <span className="text-[10px] opacity-60">{opt.hint}</span>
            </span>
            <span className="text-xs shrink-0 text-right">
              <span className="text-blue-600 block">{opt.preview.pro}g P</span>
              <span className="text-emerald-600 font-bold">{opt.preview.cal} kcal</span>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-medium border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100 p-0"
        style={{ color: '#78350f' }}
      >
        Hủy
      </button>
    </div>
  );
}

export function MeatCatalogReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100 p-0"
        style={{ color: tezcaTheme.text }}
        aria-expanded={open}
      >
        Bảng thịt / 100g (tránh nhầm gà · heo · bò)
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div
          className="mt-2 rounded-xl border overflow-hidden text-[11px] max-h-[220px] overflow-y-auto tezca-dash-scrollbar"
          style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
        >
          {MEAT_CATALOG_GROUPS.map((group) => (
            <div key={group.title}>
              <p
                className="sticky top-0 px-2 py-1.5 font-bold uppercase tracking-wider m-0 text-[10px]"
                style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}
              >
                {group.title}
              </p>
              <ul className="m-0 p-0 list-none">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex justify-between gap-2 px-2 py-1.5 border-b last:border-b-0"
                    style={{ borderColor: tezcaTheme.border }}
                  >
                    <span className="font-medium">{entry.label}</span>
                    <span className="opacity-70 shrink-0 text-right">
                      P {entry.per100g.pro} · C {entry.per100g.carb} · {entry.per100g.cal} kcal
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
