import { FEED_MODES, type CommunityFeedMode } from '../../lib/communityFeed';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

type CommunityFeedTabsProps = {
  mode: CommunityFeedMode;
  onModeChange: (mode: CommunityFeedMode) => void;
};

export function CommunityFeedTabs({ mode, onModeChange }: CommunityFeedTabsProps) {
  const active = FEED_MODES.find((m) => m.id === mode);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-1 rounded-xl" style={tezcaCardStyle}>
        {FEED_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            className="flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-semibold border-0 cursor-pointer transition-opacity"
            style={
              mode === item.id
                ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                : { color: tezcaTheme.textMuted, backgroundColor: 'transparent' }
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      {active && (
        <p className="text-xs opacity-60 m-0 px-1" style={{ color: tezcaTheme.text }}>
          {active.hint}
        </p>
      )}
    </div>
  );
}
