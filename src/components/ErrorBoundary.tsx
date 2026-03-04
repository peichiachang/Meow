import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  autoReloadAttempted: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private autoReloadTimer: number | null = null;

  state: State = { hasError: false, error: null, autoReloadAttempted: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    // 當錯誤發生且是模組載入錯誤時，自動重新載入
    if (this.state.hasError && !prevState.hasError && !this.state.autoReloadAttempted) {
      const isModuleError = 
        this.state.error?.message.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message.includes('Loading chunk') ||
        this.state.error?.message.includes('Failed to fetch');

      if (isModuleError) {
        this.setState({ autoReloadAttempted: true });
        this.autoReloadTimer = window.setTimeout(() => {
          this.handleReload();
        }, 1000);
      }
    }
  }

  componentWillUnmount() {
    if (this.autoReloadTimer !== null) {
      clearTimeout(this.autoReloadTimer);
    }
  }

  handleReload = () => {
    // 清除快取後重新載入
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
        window.location.replace('/?v=' + Date.now() + '&reason=error-boundary');
      }).catch(() => {
        window.location.replace('/?v=' + Date.now() + '&reason=error-boundary');
      });
    } else {
      window.location.replace('/?v=' + Date.now() + '&reason=error-boundary');
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 檢查是否為模組載入錯誤（可能是舊版本 bundle）
      const isModuleError = 
        this.state.error.message.includes('Failed to fetch dynamically imported module') ||
        this.state.error.message.includes('Loading chunk') ||
        this.state.error.message.includes('Failed to fetch');

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
          {isModuleError ? (
            <>
              <p style={{ margin: '1rem 0' }}>
                偵測到版本不匹配，正在載入最新版本…
              </p>
              <p style={{ margin: '1rem 0', fontSize: '0.9rem', color: '#78716c' }}>
                如果未自動重新載入，請點擊下方按鈕
              </p>
            </>
          ) : (
            <p style={{ margin: '1rem 0' }}>{this.state.error.message}</p>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.5rem 1rem',
              background: '#1c1917',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {isModuleError ? '載入最新版本' : '重新整理'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
