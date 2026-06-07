import { FEED_MODES, type CommunityFeedMode } from '../../lib/communityFeed';
import { communityShell } from '../../lib/communityShellTheme';
import { tezcaTheme } from '../../lib/tezcaTheme';

type CommunityFeedTabsProps = {
  mode: CommunityFeedMode;
  onModeChange: (mode: CommunityFeedMode) => void;
};

export function CommunityFeedTabs({ mode, onModeChange }: CommunityFeedTabsProps) {
  return (
    <div
      className="flex gap-1 p-1 rounded-xl border"
      style={{
        backgroundColor: communityShell.cardBg,
        borderColor: communityShell.cardBorder,
        boxShadow: communityShell.cardShadow,
      }}
    >
      {FEED_MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onModeChange(item.id)}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-medium border-0 cursor-pointer transition-colors"
          style={
            mode === item.id
              ? { backgroundColor: communityShell.navActiveBg, color: communityShell.navActiveText }
              : { color: communityShell.navText, backgroundColor: 'transparent' }
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
