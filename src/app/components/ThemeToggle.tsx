import React from 'react';
import { useTheme } from '../lib/useTheme';

/**
 * Nút toggle Dark Mode — icon mặt trời/trăng.
 * Đặt ở header hoặc settings page.
 */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.25rem',
        padding: '0.5rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s',
      }}
      className="hover:bg-muted"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
