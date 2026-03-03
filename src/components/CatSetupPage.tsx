import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { PERSONALITY_LABELS } from '../data/personalities';
import {
  getCatAvatarLocal,
  saveCatAvatarLocal,
  removeCatAvatarLocal,
} from '../services/localAvatarService';
import type { Cat, CatInsert } from '../types/database';
import './CatSetupPage.css';

const AVATAR_VIEWPORT_DEFAULT = 280;
const MIN_SCALE = 0.2; // 允許縮小到 0.2，避免初始 fit 已在 0.4 時無法再縮小
const MAX_SCALE = 2;

interface AvatarEditorProps {
  imageUrl: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

function AvatarEditor({ imageUrl, onConfirm, onCancel }: AvatarEditorProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState(AVATAR_VIEWPORT_DEFAULT);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);
  const touchDragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || AVATAR_VIEWPORT_DEFAULT;
      setViewportSize(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 防止頁面隨手指縮放：用 passive: false 讓 preventDefault 生效（僅 touchmove）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length >= 1) e.preventDefault();
    };
    el.addEventListener('touchmove', preventZoom, { passive: false });
    return () => el.removeEventListener('touchmove', preventZoom);
  }, []);

  // 僅在圖片「初次載入」時 fit 一次，避免 viewport 變動時一直重設 scale 導致無法縮小
  useEffect(() => {
    const img = imgRef.current;
    const el = containerRef.current;
    if (!img || !el) return;
    const onLoad = () => {
      if (!img.naturalWidth) return;
      const w = el.clientWidth || AVATAR_VIEWPORT_DEFAULT;
      const h = el.clientHeight || AVATAR_VIEWPORT_DEFAULT;
      const fitScale = Math.min(w / img.naturalWidth, h / img.naturalHeight, 1);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    };
    if (img.complete && img.naturalWidth) onLoad();
    else img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [imageUrl]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e as React.MouseEvent).button !== undefined && (e as React.MouseEvent).button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: { ...offset } };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.startOffset.x + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startOffset.y + (e.clientY - dragRef.current.startY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + s * delta)));
  };

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchDragRef.current = null;
      const dist = getTouchDistance(e.touches);
      pinchRef.current = { initialDistance: Math.max(10, dist), initialScale: scale };
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      touchDragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startOffset: { ...offset },
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const pinch = pinchRef.current;
      if (pinch && pinch.initialDistance > 0) {
        e.preventDefault();
        const d = getTouchDistance(e.touches);
        const rawRatio = d / pinch.initialDistance;
        // 放大上限 1.5、縮小下限 0.5，避免瞬間極大且能正常縮小
        const ratio = Math.min(1.5, Math.max(0.5, rawRatio));
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.initialScale * ratio));
        setScale(nextScale);
      }
    } else if (e.touches.length === 1 && touchDragRef.current) {
      e.preventDefault();
      setOffset({
        x: touchDragRef.current.startOffset.x + (e.touches[0].clientX - touchDragRef.current.startX),
        y: touchDragRef.current.startOffset.y + (e.touches[0].clientY - touchDragRef.current.startY),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) touchDragRef.current = null;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const size = viewportSize;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    ctx.save();
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
    try {
      let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (size > AVATAR_VIEWPORT_DEFAULT) {
        const small = document.createElement('canvas');
        small.width = AVATAR_VIEWPORT_DEFAULT;
        small.height = AVATAR_VIEWPORT_DEFAULT;
        const sctx = small.getContext('2d');
        if (sctx) {
          sctx.drawImage(canvas, 0, 0, size, size, 0, 0, AVATAR_VIEWPORT_DEFAULT, AVATAR_VIEWPORT_DEFAULT);
          dataUrl = small.toDataURL('image/jpeg', 0.85);
        }
      }
      onConfirm(dataUrl);
    } catch {
      onConfirm(img.src);
    }
  };

  return (
    <div className="avatar-editor-overlay" role="dialog" aria-modal="true" aria-label="預覽與裁切頭像">
      <div
        className="avatar-editor-bg-photo"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden
      />
      <div className="avatar-editor-mask" aria-hidden />
      <div className="avatar-editor avatar-editor-fullpage">
        <h2 className="avatar-editor-title">預覽與裁切</h2>
        <p className="avatar-editor-hint">拖曳移動、雙指或按鈕縮放，圓圈內為頭像裁切範圍，確認後套用</p>
        <div
          ref={containerRef}
          className="avatar-editor-viewport"
          style={{ width: 'min(85vmin, 400px)', height: 'min(85vmin, 400px)' }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className="avatar-editor-image-wrap"
            style={{
              left: viewportSize / 2,
              top: viewportSize / 2,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img ref={imgRef} src={imageUrl} alt="預覽" draggable={false} />
          </div>
        </div>
        <div className="avatar-editor-zoom-btns">
          <button
            type="button"
            className="avatar-editor-zoom-btn"
            aria-label="縮小"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setScale((s) => Math.max(MIN_SCALE, s - 0.25));
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setScale((s) => Math.max(MIN_SCALE, s - 0.25));
            }}
          >
            −
          </button>
          <button
            type="button"
            className="avatar-editor-zoom-btn"
            aria-label="放大"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setScale((s) => Math.min(MAX_SCALE, s + 0.25));
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setScale((s) => Math.min(MAX_SCALE, s + 0.25));
            }}
          >
            +
          </button>
        </div>
        <div className="avatar-editor-actions">
          <button type="button" className="cat-avatar-btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="avatar-editor-confirm" onClick={handleConfirm}>
            確認
          </button>
        </div>
      </div>
    </div>
  );
}

export type CatSetupFormData = Omit<CatInsert, 'user_id'>;

interface Props {
  /** 新增時送出，需回傳建立的 Cat（供頭像存本機時寫入用） */
  onSubmit: (data: CatSetupFormData) => Promise<Cat>;
  onBack?: () => void;
  onUpdate?: (id: string, data: CatSetupFormData) => Promise<void>;
  initialCat?: Cat | null;
  maxCats: number;
  currentCount: number;
}

export function CatSetupPage({
  onSubmit,
  onBack,
  onUpdate,
  initialCat,
  maxCats,
  currentCount,
}: Props) {
  const [catName, setCatName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [preferences, setPreferences] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [habits, setHabits] = useState('');
  const [selfRef, setSelfRef] = useState('');
  const [customPersonality, setCustomPersonality] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setSelfRef(initialCat.self_ref ?? '');
      setAvatarDataUrl(getCatAvatarLocal(initialCat.id) ?? initialCat.avatar_url ?? null);
      setCustomPersonality('');
    }
  }, [initialCat]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔（JPG、PNG、WebP 或 GIF）');
      return;
    }
    setError('');
    setEditorImageUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditorConfirm = (dataUrl: string) => {
    setAvatarDataUrl(dataUrl);
    if (editorImageUrl?.startsWith('blob:')) URL.revokeObjectURL(editorImageUrl);
    setEditorImageUrl(null);
  };

  const handleEditorCancel = () => {
    if (editorImageUrl?.startsWith('blob:')) URL.revokeObjectURL(editorImageUrl);
    setEditorImageUrl(null);
  };

  const clearAvatar = () => {
    setAvatarDataUrl(null);
    if (initialCat) removeCatAvatarLocal(initialCat.id);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      self_ref: selfRef.trim() || null,
      avatar_url: initialCat?.avatar_url ?? null,
    };

    setLoading(true);
    try {
      if (isEditMode && onUpdate && initialCat) {
        if (avatarDataUrl) saveCatAvatarLocal(initialCat.id, avatarDataUrl);
        await onUpdate(initialCat.id, payload);
        onBack?.();
      } else {
        const created = await onSubmit(payload);
        if (avatarDataUrl) saveCatAvatarLocal(created.id, avatarDataUrl);
        onBack?.();
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

        {editorImageUrl && (
          <AvatarEditor
            imageUrl={editorImageUrl}
            onConfirm={handleEditorConfirm}
            onCancel={handleEditorCancel}
          />
        )}

        <form onSubmit={handleSubmit} className="cat-setup-form">
          <div className="form-group cat-avatar-upload">
            <span>貓咪照片</span>
            <div className="cat-avatar-upload-area">
              <div className="cat-avatar-preview">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="預覽" />
                ) : (
                  <span className="cat-avatar-preview-placeholder">🐱</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="cat-avatar-input"
                aria-label="選擇貓咪照片"
              />
              <div className="cat-avatar-actions">
                <button
                  type="button"
                  className="cat-avatar-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarDataUrl ? '更換圖片' : '選擇圖片'}
                </button>
                {avatarDataUrl && (
                  <button type="button" className="cat-avatar-btn-secondary" onClick={clearAvatar}>
                    移除
                  </button>
                )}
              </div>
            </div>
            <p className="cat-avatar-hint">建議 JPG、PNG、WebP 或 GIF，單檔 3MB 以內；選擇後可拖曳縮放調整位置</p>
          </div>

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
              placeholder="例如：朕、本宮、本王、本喵、我（留空則罐頭回覆隨機用本喵／我／本大爺）"
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
