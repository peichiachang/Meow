import { useState, useRef, useEffect } from 'react';
import { getOpeningLine } from '../data/openingLines';
import { getKeywordCannedReply } from '../data/keywordCannedMessages';
import { isEmotionalTrigger } from '../data/triggerCategories';
import { getCatDisplayAvatar } from '../services/localAvatarService';
import { getCurrentWeather } from '../services/weatherService';
import { sendChatMessage } from '../services/chatService';
import { triggerMemorySummarize } from '../services/memoryService';
import type { Cat } from '../types/database';
import type { Message } from '../types/database';
import './ChatPage.css';

const LAST_OPEN_KEY = 'meow:last_open';

interface Props {
  cats: Cat[];
  selectedCat: Cat;
  onSelectCat: (cat: Cat) => void;
  onBack: () => void;
  messages: Message[];
  onAddMessage: (role: 'user' | 'assistant', content: string) => Promise<Message>;
  getRecentMessages: () => Message[];
  memorySummary: string | null;
  canSend: boolean;
  remaining: number;
  onIncrementCount: () => Promise<boolean>;
  onSignOut: () => void;
}

export function ChatPage({
  cats,
  selectedCat,
  onSelectCat,
  onBack,
  messages,
  onAddMessage,
  getRecentMessages,
  memorySummary,
  canSend,
  remaining,
  onIncrementCount,
  onSignOut,
}: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openingLine, setOpeningLine] = useState<string | null>(null);
  const [showOpening, setShowOpening] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 開場白：每次進入或切換貓咪時（含選填天氣，需位置授權）
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const lastStr = localStorage.getItem(LAST_OPEN_KEY);
    const last = lastStr ? parseInt(lastStr, 10) : null;
    const hoursSince = last ? (Date.now() - last) / (1000 * 60 * 60) : null;

    const baseContext = {
      hour,
      hoursSinceLastOpen: hoursSince,
      personality: selectedCat.personality,
    };
    const lineWithoutWeather = getOpeningLine(selectedCat.cat_name, baseContext);
    setOpeningLine(lineWithoutWeather);
    setShowOpening(true);
    localStorage.setItem(LAST_OPEN_KEY, Date.now().toString());

    getCurrentWeather().then((weather) => {
      if (weather?.condition) {
        const lineWithWeather = getOpeningLine(selectedCat.cat_name, {
          ...baseContext,
          weather: weather.condition,
        });
        setOpeningLine(lineWithWeather);
      }
    });
  }, [selectedCat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || !canSend) return;

    setShowOpening(false);
    setInput('');
    setLoading(true);

    const recentBefore = getRecentMessages();

    try {
      await onAddMessage('user', text);
      await onIncrementCount();

      const lastAssistantTexts = messages
        .filter((m) => m.role === 'assistant')
        .slice(-2)
        .map((m) => m.content);
      const cannedReply = getKeywordCannedReply(text, selectedCat.personality, {
        excludeTexts: lastAssistantTexts.length ? lastAssistantTexts : undefined,
        slotOverrides: selectedCat.self_ref
          ? { subject: selectedCat.self_ref }
          : undefined,
        preferences: selectedCat.preferences ?? undefined,
        dislikes: selectedCat.dislikes ?? undefined,
      });
      // 情緒類：隨機選罐頭或 AI（只回一則），因罐頭切題性有限
      let reply: string;
      if (isEmotionalTrigger(text)) {
        if (cannedReply !== null && Math.random() < 0.5) {
          reply = cannedReply;
        } else {
          reply = await sendChatMessage(
            selectedCat,
            text,
            recentBefore,
            memorySummary
          );
        }
      } else {
        reply =
          cannedReply ??
          (await sendChatMessage(
            selectedCat,
            text,
            recentBefore,
            memorySummary
          ));
      }

      await onAddMessage('assistant', reply);

      await onAddMessage('assistant', reply);
      // SDD 2.5：每 10 則對話後非同步觸發記憶摘要
      const newCount = messages.length + 2; // user + assistant
      if (newCount > 0 && newCount % 20 === 0) {
        triggerMemorySummarize(selectedCat.id);
      }
    } catch (err) {
      // API 失敗時改顯示隨機罐頭訊息，避免整頁都是錯誤提示
      const fallback = getOpeningLine(selectedCat.cat_name, {
        hour: new Date().getHours(),
        hoursSinceLastOpen: null,
        personality: selectedCat.personality,
      });
      await onAddMessage('assistant', fallback);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const displayMessages = showOpening && openingLine
    ? [
        {
          id: 'opening',
          role: 'assistant' as const,
          content: openingLine,
          created_at: new Date().toISOString(),
        },
        ...messages,
      ]
    : messages;

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button
          type="button"
          className="chat-back-btn"
          onClick={onBack}
          title="返回主畫面"
          aria-label="返回主畫面"
        >
          ←
        </button>
        <div className="cat-selector">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cat-avatar-btn ${c.id === selectedCat.id ? 'active' : ''}`}
              onClick={() => onSelectCat(c)}
              title={c.cat_name}
            >
              <span className="cat-avatar">
                {(() => {
                  const avatarUrl = getCatDisplayAvatar(c);
                  return avatarUrl ? (
                    <img src={avatarUrl} alt={c.cat_name} />
                  ) : (
                    <span className="cat-avatar-placeholder">🐱</span>
                  );
                })()}
              </span>
              <span className="cat-name">{c.cat_name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sign-out-btn"
          onClick={onSignOut}
          title="登出"
        >
          登出
        </button>
      </header>

      <main className="chat-main">
        {displayMessages.length === 0 ? (
          <div className="chat-welcome">
            <p>和 {selectedCat.cat_name} 說說話吧～</p>
          </div>
        ) : (
          <div className="chat-messages">
            {displayMessages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.role}`}>
                <span className="chat-msg-avatar">
                  {m.role === 'user' ? '👤' : '🐱'}
                </span>
                <div className="chat-msg-bubble">
                  <p>{m.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <span className="chat-msg-avatar">🐱</span>
                <div className="chat-msg-bubble typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <form className="chat-input-area" onSubmit={handleSend}>
        {!canSend && (
          <p className="limit-msg">
            今天說了好多話，明天再繼續？升級後不限次數 🐾
          </p>
        )}
        <div className="input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="輸入訊息..."
            rows={1}
            disabled={loading || !canSend}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !canSend}
          >
            送出
          </button>
        </div>
        {canSend && remaining !== Infinity && (
          <p className="remaining-msg">今日剩餘 {remaining} 則</p>
        )}
      </form>
    </div>
  );
}
