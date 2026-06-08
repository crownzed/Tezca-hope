/**
 * Analytics utility — hỗ trợ Plausible hoặc Umami.
 *
 * Cấu hình qua env:
 * - VITE_ANALYTICS_PROVIDER: 'plausible' | 'umami' (mặc định: không load)
 * - VITE_ANALYTICS_DOMAIN: domain cho Plausible (VD: tezca.vn)
 * - VITE_ANALYTICS_SCRIPT: URL script analytics
 * - VITE_ANALYTICS_WEBSITE_ID: website ID cho Umami
 *
 * Gọi initAnalytics() trong main.tsx — chỉ inject script khi có config.
 */

const PROVIDER = import.meta.env.VITE_ANALYTICS_PROVIDER as string | undefined;
const SCRIPT_URL = import.meta.env.VITE_ANALYTICS_SCRIPT as string | undefined;
const DOMAIN = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined;
const WEBSITE_ID = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;

/** Inject analytics script vào head */
export function initAnalytics() {
  if (!PROVIDER || !SCRIPT_URL) return;

  // Tránh inject 2 lần
  if (document.querySelector('script[data-tezca-analytics]')) return;

  const script = document.createElement('script');
  script.src = SCRIPT_URL;
  script.defer = true;
  script.setAttribute('data-tezca-analytics', 'true');

  if (PROVIDER === 'plausible') {
    script.setAttribute('data-domain', DOMAIN || window.location.hostname);
  } else if (PROVIDER === 'umami') {
    script.setAttribute('data-website-id', WEBSITE_ID || '');
  }

  document.head.appendChild(script);
}

/** Gửi custom event (pageview tự động, đây là cho events thêm) */
export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
  if (!PROVIDER) return;

  if (PROVIDER === 'plausible') {
    // Plausible custom events
    const plausible = (window as unknown as { plausible?: (...args: unknown[]) => void }).plausible;
    if (plausible) {
      plausible(eventName, { props });
    }
  } else if (PROVIDER === 'umami') {
    // Umami custom events
    const umami = (window as unknown as { umami?: { track: (name: string, data?: unknown) => void } }).umami;
    if (umami) {
      umami.track(eventName, props);
    }
  }
}
