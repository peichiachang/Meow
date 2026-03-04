import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// 隱藏歡迎畫面（bundle 已成功載入）
const welcomeScreen = document.getElementById('welcome-screen')
if (welcomeScreen) {
  welcomeScreen.style.display = 'none'
}

// 監控未處理的錯誤，可能是舊版本 bundle 導致的
window.addEventListener('error', (event) => {
  // 如果是模組載入錯誤，可能是舊版本 bundle 不存在
  if (event.error && event.error.message && event.error.message.includes('Failed to fetch dynamically imported module')) {
    console.error('[Main] Dynamic import failed, possible old bundle:', event.error)
    // 不自動重新整理，讓 ErrorBoundary 處理
  }
})

// 監控未處理的 Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  // 如果是模組載入失敗，記錄但不自動重新整理
  if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
    const message = String(event.reason.message)
    if (message.includes('Failed to fetch') || message.includes('Loading chunk')) {
      console.error('[Main] Chunk load failed, possible version mismatch:', event.reason)
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {hasSupabase ? (
        <App />
      ) : (
        <div style={{ padding: '2rem', maxWidth: 480, margin: '0 auto', fontFamily: 'system-ui', color: '#1c1917' }}>
          <h2 style={{ color: '#b91c1c' }}>環境變數未設定</h2>
          <p>請在 Vercel 專案設定中新增：</p>
          <ul>
            <li><code>VITE_SUPABASE_URL</code></li>
            <li><code>VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
          <p>設定後請重新部署（Redeploy）。</p>
        </div>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
