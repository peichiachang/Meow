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
import type { Cat } from './types/database';
import './App.css';

/** 登入後檢查伺服器 version.json 與目前 bundle 版本，若不同則提示重新整理 */
function useNewVersionCheck(enabled: boolean) {
  const [showBanner, setShowBanner] = useState(false);
  const [showFallbackHint, setShowFallbackHint] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const url = '/version.json?t=' + Date.now();
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) return null;
        const contentType = r.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) return null;
        return r.json();
      })
      .then((data: { version?: string } | null) => {
        if (data?.version != null && data.version !== __BUILD_VERSION__) {
          setShowBanner(true);
        } else if (data === null) {
          setShowFallbackHint(true);
        }
      })
      .catch(() => setShowFallbackHint(true));
  }, [enabled]);
  return { showBanner, showFallbackHint };
}

const MAX_CATS = 3;

function App() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleOpenedInNewWindow, setGoogleOpenedInNewWindow] = useState(false);
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { plan } = useProfile(user?.id);
  const { cats, loading: catsLoading, createCat, updateCat, deleteCat } = useCats(user?.id);
  const maxCats = MAX_CATS;

  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [view, setView] = useState<'main' | 'chat' | 'setup'>('main');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const { showBanner: showNewVersionBanner, showFallbackHint } = useNewVersionCheck(!!user);

  const currentCatForMessages = selectedCat ?? cats[0];
  const { messages, addMessage, getRecentForContext } = useMessages(currentCatForMessages?.id);
  const { canSend, remaining, incrementCount } = useMessageLimit(user?.id, plan);

  const memorySummary = (selectedCat ?? cats[0])?.memory_summary ?? null;

  useEffect(() => {
    if (cats.length > 0 && !selectedCat) {
      setSelectedCat(cats[0]);
    }
  }, [cats, selectedCat]);

  useEffect(() => {
    if (cats.length > 0 && view === 'main') {
      setSelectedCat((prev) => prev ?? cats[0]);
    }
  }, [cats, view]);

  // 當 cats 載入完成且有貓咪時，確保顯示 MainPage（除非正在編輯或聊天）
  useEffect(() => {
    if (!catsLoading && cats.length > 0 && view !== 'setup' && view !== 'chat') {
      setView('main');
    }
  }, [catsLoading, cats.length, view]);

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

  // 如果沒有貓咪，顯示設定頁面
  if (cats.length === 0) {
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
        userId={user?.id}
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
      onSelectCat={setSelectedCat}
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
