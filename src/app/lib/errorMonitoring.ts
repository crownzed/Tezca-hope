/**
 * Error monitoring utility — bắt và gửi lỗi frontend lên reporting service.
 *
 * Cấu hình:
 * - VITE_ERROR_REPORT_URL: endpoint nhận error reports (POST JSON)
 * - Nếu không set, chỉ log ra console (dev mode)
 *
 * Tích hợp Sentry sau: thay reportError bằng Sentry.captureException()
 */

type ErrorReport = {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  extra?: Record<string, unknown>;
};

const REPORT_URL = import.meta.env.VITE_ERROR_REPORT_URL as string | undefined;

/** Queue để batch gửi, tránh spam */
let queue: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 10);
  flushTimer = null;

  if (!REPORT_URL) {
    // Dev: chỉ log
    batch.forEach((r) => console.warn('[ErrorMonitor]', r.message, r));
    return;
  }

  // Production: gửi lên endpoint
  fetch(REPORT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ errors: batch }),
  }).catch(() => {
    // Không retry — best effort
  });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 2000);
}

/** Gửi error report */
export function reportError(
  error: Error | string,
  extra?: { componentStack?: string; userId?: string; [key: string]: unknown },
) {
  const err = typeof error === 'string' ? new Error(error) : error;

  const report: ErrorReport = {
    message: err.message,
    stack: err.stack,
    componentStack: extra?.componentStack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId: extra?.userId,
    extra,
  };

  queue.push(report);
  scheduleFlush();
}

/** Bắt unhandled errors toàn cục */
export function initErrorMonitoring() {
  window.addEventListener('error', (event) => {
    if (event.error) {
      reportError(event.error, { source: 'window.onerror' });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      reportError(reason, { source: 'unhandledrejection' });
    } else {
      reportError(String(reason), { source: 'unhandledrejection' });
    }
  });
}
