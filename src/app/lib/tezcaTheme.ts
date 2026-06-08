/**
 * TEZCA HOPE — Design System
 * Bảng màu, typography, spacing, buttons — đồng bộ toàn bộ app.
 *
 * 🎨 3 nhóm màu:
 * - Primary: teal-500 (#14B8A6) / teal-600 (#0D9488)
 * - Neutral: slate-900/600/500/200/50
 * - Semantic: red-500, green-500
 */

// === COLORS ===
export const tezcaTheme = {
  // Primary
  primary: '#14B8A6',         // teal-500
  primaryHover: '#0D9488',    // teal-600
  primaryLight: '#2DD4BF',    // teal-400
  primaryDark: '#0F766E',     // teal-700
  accentGradient: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)',

  // Neutral
  heading: '#0F172A',         // slate-900
  text: '#1E293B',            // slate-800 (body readable)
  textMuted: '#64748B',       // slate-500
  textSecondary: '#475569',   // slate-600
  border: '#E2E8F0',          // slate-200
  borderStrong: '#CBD5E1',    // slate-300
  bg: '#F8FAFC',              // slate-50
  surface: '#FFFFFF',

  // Semantic
  error: '#EF4444',           // red-500
  success: '#22C55E',         // green-500
  warning: '#F59E0B',         // amber-500

  // Derived
  sidebarSurface: 'rgba(255,255,255,0.95)',
  cardShadow: '0 8px 32px -12px rgba(15, 23, 42, 0.08)',
  inputBg: '#FFFFFF',
  subtleBg: '#F8FAFC',

  // Legacy aliases (dùng trong code cũ — sẽ dần migrate)
  accent: '#14B8A6',
  accentDark: '#0F766E',
  accentLight: '#2DD4BF',
} as const;

export const tezcaCardStyle = {
  backgroundColor: tezcaTheme.surface,
  border: `1px solid ${tezcaTheme.border}`,
  boxShadow: tezcaTheme.cardShadow,
  borderRadius: '1.5rem',
} as const;

// === TYPOGRAPHY (inline style helpers) ===
export const tezcaTypography = {
  h1: {
    fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', // text-5xl → text-6xl responsive
    fontWeight: 800,
    color: tezcaTheme.heading,
    lineHeight: 1.1,
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: 'clamp(1.875rem, 3.5vw, 2.25rem)', // text-3xl → text-4xl
    fontWeight: 700,
    color: tezcaTheme.heading,
    lineHeight: 1.2,
    marginBottom: '1.5rem',
  },
  h3: {
    fontSize: '1.25rem', // text-xl
    fontWeight: 600,
    color: tezcaTheme.heading,
    lineHeight: 1.3,
    marginBottom: '0.75rem',
  },
  body: {
    fontSize: '1rem', // text-base
    color: tezcaTheme.textSecondary,
    lineHeight: 1.625, // leading-relaxed
  },
  small: {
    fontSize: '0.875rem', // text-sm
    color: tezcaTheme.textMuted,
    lineHeight: 1.5,
  },
} as const;

// === BUTTON STYLES ===
export const tezcaButton = {
  primary: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    backgroundColor: tezcaTheme.primary,
    color: '#FFFFFF',
    fontWeight: 600,
    borderRadius: '9999px',
    border: 'none',
    transition: 'all 150ms ease',
    cursor: 'pointer',
  },
  primaryHover: {
    backgroundColor: tezcaTheme.primaryHover,
  },
  secondary: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#FFFFFF',
    color: tezcaTheme.textSecondary,
    fontWeight: 600,
    borderRadius: '9999px',
    border: `1px solid ${tezcaTheme.border}`,
    transition: 'all 150ms ease',
    cursor: 'pointer',
  },
  secondaryHover: {
    borderColor: tezcaTheme.borderStrong,
  },
} as const;

// === SPACING (reference — dùng Tailwind classes) ===
// Section padding: py-16 lg:py-24
// Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
// Heading → content: mb-6 hoặc mb-8
// Elements gap: gap-4
// Card padding: p-8 md:p-10
// Button padding: px-6 py-3

// === CONTAINER (inline style helper) ===
export const tezcaContainer = {
  maxWidth: '80rem', // max-w-7xl = 1280px
  marginInline: 'auto',
  paddingInline: 'clamp(1rem, 3vw, 2rem)',
} as const;
