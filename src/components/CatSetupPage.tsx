import { useState, useEffect } from 'react';
import { PERSONALITY_LABELS } from '../data/personalities';
import type { Cat, CatInsert } from '../types/database';
import './CatSetupPage.css';

export type CatSetupFormData = Omit<CatInsert, 'user_id'>;

interface Props {
  onSubmit: (data: CatSetupFormData) => Promise<void>;
  onBack?: () => void;
  onUpdate?: (id: string, data: CatSetupFormData) => Promise<void>;
  initialCat?: Cat | null;
  maxCats: number;
  currentCount: number;
}

export function CatSetupPage({ onSubmit, onBack, onUpdate, initialCat, maxCats, currentCount }: Props) {
  const [catName, setCatName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [preferences, setPreferences] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [habits, setHabits] = useState('');
  const [selfRef, setSelfRef] = useState('我');
  const [customPersonality, setCustomPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!initialCat;

  useEffect(() => {
    if (initialCat) {
      setCatName(initialCat.cat_name);
      setBreed(initialCat.breed ?? '');
      setAge(initialCat.age ?? '');
      setPersonality(initialCat.personality ?? []);
      setPreferences(initialCat.preferences ?? '');
      setDislikes(initialCat.dislikes ?? '');
      setHabits(initialCat.habits ?? '');
      setSelfRef(initialCat.self_ref ?? '我');
      setCustomPersonality('');
    }
  }, [initialCat]);

  const togglePersonality = (p: string) => {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!catName.trim()) {
      setError('請輸入貓咪名字');
      return;
    }

    const personalityList = [
      ...personality,
      ...(customPersonality.trim() ? [customPersonality.trim()] : []),
    ];
    if (personalityList.length === 0) {
      setError('請至少選擇或輸入一個個性');
      return;
    }

    const payload: CatSetupFormData = {
      cat_name: catName.trim(),
      breed: breed.trim() || null,
      age: age === '' ? null : Number(age),
      personality: personalityList,
      preferences: preferences.trim() || null,
      dislikes: dislikes.trim() || null,
      habits: habits.trim() || null,
      self_ref: selfRef.trim() || '我',
    };

    setLoading(true);
    try {
      if (isEditMode && onUpdate && initialCat) {
        await onUpdate(initialCat.id, payload);
        onBack?.();
      } else {
        await onSubmit(payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!isEditMode && currentCount >= maxCats) {
    return (
      <div className="cat-setup-page">
        <div className="cat-setup-card">
          <p>已達貓咪數量上限（{maxCats} 隻），升級後可新增更多。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cat-setup-page">
      <div className="cat-setup-card">
        {onBack && (
          <button
            type="button"
            className="cat-setup-back"
            onClick={onBack}
            title="返回主畫面"
          >
            ← 返回
          </button>
        )}
        <h1>{isEditMode ? '編輯貓咪' : '設定你的貓咪'}</h1>
        <p className="cat-setup-sub">AI 會依照這些設定模擬牠說話</p>

        <form onSubmit={handleSubmit} className="cat-setup-form">
          <label>
            <span>貓咪名字 *</span>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="例如：咪咪"
              required
            />
          </label>

          <label>
            <span>品種</span>
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="例如：英國短毛貓"
            />
          </label>

          <label>
            <span>年齡（歲）</span>
            <input
              type="number"
              min={0}
              max={30}
              value={age}
              onChange={(e) =>
                setAge(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="例如：3"
            />
          </label>

          <label>
            <span>貓咪自稱</span>
            <input
              value={selfRef}
              onChange={(e) => setSelfRef(e.target.value)}
              placeholder="例如：朕、本宮、本王、本喵、我（預設：我）"
            />
          </label>

          <div className="form-group">
            <span>個性 *（可多選）</span>
            <div className="personality-grid">
              {PERSONALITY_LABELS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`personality-btn ${personality.includes(p) ? 'active' : ''}`}
                  onClick={() => togglePersonality(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              className="custom-personality"
              value={customPersonality}
              onChange={(e) => setCustomPersonality(e.target.value)}
              placeholder="或自由輸入個性描述"
            />
          </div>

          <label>
            <span>喜歡</span>
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="例如：罐罐、曬太陽、被摸下巴"
              rows={2}
            />
          </label>

          <label>
            <span>討厭</span>
            <textarea
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              placeholder="例如：洗澡、打雷"
              rows={2}
            />
          </label>

          <label>
            <span>習慣動作</span>
            <textarea
              value={habits}
              onChange={(e) => setHabits(e.target.value)}
              placeholder="例如：早上會踩奶、喜歡盯著窗外"
              rows={2}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? '儲存中...' : isEditMode ? '儲存' : '完成'}
          </button>
        </form>
      </div>
    </div>
  );
}
