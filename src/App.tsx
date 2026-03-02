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

const FREE_MAX_CATS = 1;
const PAID_MAX_CATS = 5;

function App() {
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuth();
  const { plan } = useProfile(user?.id);
  const { cats, loading: catsLoading, createCat } = useCats(user?.id);
  const maxCats = plan === 'paid' ? PAID_MAX_CATS : FREE_MAX_CATS;

  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [view, setView] = useState<'main' | 'chat' | 'setup'>('main');

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

  const handleSignIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '登入失敗');
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signUpWithEmail(email, password);
      setAuthError('請至信箱確認驗證信後登入');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '註冊失敗');
    }
  };

  const handleSignInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
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
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignInWithGoogle={handleSignInWithGoogle}
        error={authError}
        clearError={() => setAuthError(null)}
      />
    );
  }

  if (catsLoading) {
    return (
      <div className="app-loading">
        <p>載入中...</p>
      </div>
    );
  }

  if (cats.length === 0) {
    return (
      <CatSetupPage
        onSubmit={async (data) => {
          const cat = await createCat(data);
          handleCatCreated(cat);
        }}
        maxCats={maxCats}
        currentCount={0}
      />
    );
  }

  if (view === 'setup') {
    return (
      <CatSetupPage
        onSubmit={async (data) => {
          const cat = await createCat(data);
          handleCatCreated(cat);
        }}
        onBack={() => setView('main')}
        maxCats={maxCats}
        currentCount={cats.length}
      />
    );
  }

  if (view === 'main') {
    return (
      <MainPage
        cats={cats}
        maxCats={maxCats}
        onSelectCat={(cat) => {
          setSelectedCat(cat);
          setView('chat');
        }}
        onAddCat={() => setView('setup')}
        onSignOut={signOut}
      />
    );
  }

  const currentCat = selectedCat ?? cats[0];
  if (!currentCat) return null;

  return (
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
      onSignOut={signOut}
    />
  );
}

export default App;
