import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

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
