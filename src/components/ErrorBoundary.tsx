import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: 480,
            margin: '0 auto',
            fontFamily: 'system-ui, sans-serif',
            color: '#1c1917',
          }}
        >
          <h2 style={{ color: '#b91c1c' }}>發生錯誤</h2>
          <p style={{ margin: '1rem 0' }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              background: '#1c1917',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
