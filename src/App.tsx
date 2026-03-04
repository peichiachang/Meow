import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useCats } from './hooks/useCats';
import { useMessages } from './hooks/useMessages';
import { useMessageLimit } from './hooks/useMessageLimit';
import { AuthPage } from './components/AuthPage';
import { CatSetupPage } from './components/CatSetupPage';
import { ChatPage } from './components/ChatPage';
import { MainPage } from './components/MainPage';
import { EXEMPT_USER_IDS } from './config';
import { updateDailyContext } from './services/dailyContextService';
import type { Cat } from './types/database';
import './App.css';

/** 
 * 版本檢查已由 index.html 中的腳本處理（在 React 載入前執行）
 * 此處僅作為備用提示，不重複請求 version.json
 * 如果 index.html 的檢查失敗，顯示提示讓用戶手動重新整理
 */
function useNewVersionCheck(enabled: boolean) {
  const [showFallbackHint] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    // 不重複請求 version.json，因為 index.html 已經檢查過了
    // 只在特定情況下顯示備用提示（例如用戶長時間停留在頁面上）
    // 這裡可以選擇完全不檢查，或僅在特定條件下顯示提示
  }, [enabled]);
  return { showBanner: false, showFallbackHint };
}

const MAX_CATS = 3;
const EXEMPT_MAX_CATS = 10; // 例外帳號最多可新增的貓咪數量

function App() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleOpenedInNewWindow, setGoogleOpenedInNewWindow] = useState(false);
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { plan } = useProfile(user?.id);
  const { cats, loading: catsLoading, createCat, updateCat, deleteCat } = useCats(user?.id);
  
  // 檢查是否為例外帳號，例外帳號可新增更多貓咪
  const isExemptUser = user?.id ? EXEMPT_USER_IDS.includes(user.id) : false;
  const maxCats = isExemptUser ? EXEMPT_MAX_CATS : MAX_CATS;

  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  // 初始 view 設為 null，等待數據載入完成後再決定
  const [view, setView] = useState<'main' | 'chat' | 'setup' | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const { showBanner: showNewVersionBanner, showFallbackHint } = useNewVersionCheck(!!user);

  const currentCatForMessages = selectedCat ?? cats[0];
  const { messages, addMessage, getRecentForContext } = useMessages(currentCatForMessages?.id);
  const { canSend, remaining, incrementCount } = useMessageLimit(user?.id, plan);

  const memorySummary = (selectedCat ?? cats[0])?.memory_summary ?? null;

  // SDD v2.1: 登入後更新 daily_context（每天一次）
  useEffect(() => {
    if (user && !authLoading) {
      // 非同步更新，不阻塞 UI
      updateDailyContext().catch((err) => {
        console.error('[App] Failed to update daily context:', err);
      });
    }
  }, [user, authLoading]);

  // 初始化：當 cats 載入完成後，根據是否有貓咪來設定初始 view
  // 重要：只在 view 為 null（初始狀態）時才設定，避免重新整理時覆蓋用戶操作
  useEffect(() => {
    if (!catsLoading && view === null) {
      if (cats.length > 0) {
        setView('main');
        setSelectedCat(cats[0]);
      } else {
        setView('setup');
      }
    }
  }, [catsLoading, cats.length, view]);

  // 確保 selectedCat 與 cats 同步
  useEffect(() => {
    if (cats.length > 0 && !selectedCat) {
      setSelectedCat(cats[0]);
    }
  }, [cats, selectedCat]);

  // 當 view 為 main 時，確保有選中的貓咪
  useEffect(() => {
    if (cats.length > 0 && view === 'main' && !selectedCat) {
      setSelectedCat(cats[0]);
    }
  }, [cats, view, selectedCat]);

  // 🔧 修正重新整理問題：當 cats 載入完成且有貓咪時，如果 view 是 setup 且不是編輯模式，強制改為 main
  // 這可以修正重新整理時可能出現的競態條件
  useEffect(() => {
    if (!catsLoading && cats.length > 0 && view === 'setup' && !editingCatId) {
      // 只有在不是編輯模式時才強制改為 main
      setView('main');
      if (!selectedCat) {
        setSelectedCat(cats[0]);
      }
    }
  }, [catsLoading, cats.length, view, editingCatId, selectedCat, cats]);

  const handleSignInWithGoogle = async () => {
    setAuthError(null);
    setGoogleOpenedInNewWindow(false);
    try {
      const result = await signInWithGoogle();
      if (result?.openedInNewWindow) setGoogleOpenedInNewWindow(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google 登入失敗');
    }
  };

  const handleCatCreated = (cat: Cat) => {
    setSelectedCat(cat);
    setView('main');
  };

  if (authLoading) {
    return (
      <div className="app-loading">
        <p>載入中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        onSignInWithGoogle={handleSignInWithGoogle}
        error={authError}
        clearError={() => setAuthError(null)}
        googleOpenedInNewWindow={googleOpenedInNewWindow}
      />
    );
  }

  const newVersionBanner = showNewVersionBanner ? (
    <div className="app-new-version-banner" role="alert">
      <span>發現新版本，請重新整理以取得最新功能</span>
      <button type="button" onClick={() => window.location.reload()}>
        重新整理
      </button>
    </div>
  ) : null;

  const fallbackRefreshBanner = showFallbackHint ? (
    <div className="app-new-version-banner app-new-version-banner--hint" role="status">
      <span>若畫面異常請重新整理</span>
      <button type="button" onClick={() => window.location.reload()}>
        重新整理
      </button>
    </div>
  ) : null;

  if (catsLoading) {
    return (
      <>
        {newVersionBanner}
        {fallbackRefreshBanner}
        <div className="app-loading">
          <p>載入中...</p>
        </div>
      </>
    );
  }

  // 如果 view 還沒初始化，繼續顯示載入畫面（避免重新整理時閃現）
  if (view === null) {
    return (
      <>
        {newVersionBanner}
        {fallbackRefreshBanner}
        <div className="app-loading">
          <p>載入中...</p>
        </div>
      </>
    );
  }

  // 如果沒有貓咪，顯示設定頁面
  // 注意：必須確保 catsLoading 為 false，避免載入中時誤判
  if (!catsLoading && cats.length === 0) {
    return (
      <>
        {newVersionBanner}
        {fallbackRefreshBanner}
        <CatSetupPage
        onSubmit={async (data) => {
          const cat = await createCat(data);
          handleCatCreated(cat);
          return cat;
        }}
        onBack={() => {
          // 如果已經有貓咪了，回到主頁；否則留在設定頁
          if (cats.length > 0) {
            setView('main');
          }
        }}
        maxCats={maxCats}
        currentCount={0}
      />
      </>
    );
  }

  if (view === 'setup') {
    const editingCat = editingCatId ? cats.find((c) => c.id === editingCatId) ?? null : null;
    return (
      <>
        {newVersionBanner}
        {fallbackRefreshBanner}
        <CatSetupPage
        onSubmit={async (data) => {
          const cat = await createCat(data);
          handleCatCreated(cat);
          return cat;
        }}
        onBack={() => {
          setEditingCatId(null);
          setView('main');
        }}
        onUpdate={
          editingCat
            ? async (id, data) => {
                await updateCat(id, data);
                setEditingCatId(null);
                setView('main');
              }
            : undefined
        }
        initialCat={editingCat}
        maxCats={maxCats}
        currentCount={cats.length}
      />
      </>
    );
  }

  if (view === 'main') {
    return (
      <>
        {newVersionBanner}
        {fallbackRefreshBanner}
        <MainPage
        cats={cats}
        maxCats={maxCats}
        onSelectCat={(cat) => {
          setSelectedCat(cat);
          setView('chat');
        }}
        onAddCat={() => {
          setEditingCatId(null);
          setView('setup');
        }}
        onEditCat={(cat) => {
          setEditingCatId(cat.id);
          setView('setup');
        }}
        onDeleteCat={(cat) => {
          deleteCat(cat.id);
          if (selectedCat?.id === cat.id) {
            const rest = cats.filter((c) => c.id !== cat.id);
            setSelectedCat(rest[0] ?? null);
          }
        }}
        onSignOut={signOut}
      />
      </>
    );
  }

  const currentCat = selectedCat ?? cats[0];
  if (!currentCat) return null;

  return (
    <>
      {newVersionBanner}
      {fallbackRefreshBanner}
      <ChatPage
      cats={cats}
      selectedCat={currentCat}
      onBack={() => setView('main')}
      messages={messages}
      onAddMessage={addMessage}
      getRecentMessages={getRecentForContext}
      memorySummary={memorySummary}
      canSend={canSend}
      remaining={remaining}
      onIncrementCount={incrementCount}
    />
    </>
  );
}

export default App;
