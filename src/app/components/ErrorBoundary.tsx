import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/errorMonitoring';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * ErrorBoundary — bắt lỗi runtime React, hiển thị UI thân thiện thay vì màn trắng.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Gửi lên error monitoring service
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#dc2626' }}>
            Đã xảy ra lỗi
          </h2>
          <p style={{ color: '#555', marginBottom: '1.5rem', maxWidth: '400px' }}>
            Ứng dụng gặp sự cố. Vui lòng thử tải lại trang.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Tải lại trang
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Thử lại
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                fontSize: '0.75rem',
                maxWidth: '600px',
                overflow: 'auto',
                textAlign: 'left',
                color: '#991b1b',
              }}
            >
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
