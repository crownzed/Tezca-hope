import React from 'react';
import { useOnlineStatus } from '../lib/useOnlineStatus';

/**
 * Banner hiển thị khi mất kết nối mạng.
 * Tự ẩn khi online trở lại.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#dc2626',
        color: '#fff',
        textAlign: 'center',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      ⚠️ Mất kết nối mạng — Một số chức năng sẽ không hoạt động cho đến khi có mạng trở lại.
    </div>
  );
}
