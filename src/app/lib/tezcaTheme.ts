/** Màu / kiểu dùng chung — đồng bộ với landing (#F9F9FB, teal accent) */
export const tezcaTheme = {
  bg: '#F9F9FB',
  surface: '#ffffff',
  text: '#1A202C',
  textMuted: 'rgba(26, 32, 44, 0.65)',
  border: 'rgba(26, 32, 44, 0.08)',
  borderStrong: 'rgba(26, 32, 44, 0.12)',
  accent: '#14B8A6',
  accentDark: '#0F766E',
  accentLight: '#2DD4BF',
  accentGradient: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',
  sidebarSurface: 'rgba(255,255,255,0.9)',
  cardShadow: '0 8px 32px -12px rgba(26, 32, 44, 0.08)',
  inputBg: '#ffffff',
  subtleBg: 'rgba(26, 32, 44, 0.04)',
} as const;

export const tezcaCardStyle = {
  backgroundColor: tezcaTheme.surface,
  borderColor: tezcaTheme.border,
  boxShadow: tezcaTheme.cardShadow,
} as const;
