import { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { PERSONALITY_LABELS } from '../data/personalities';
import {
  getCatAvatarLocal,
  saveCatAvatarLocal,
  removeCatAvatarLocal,
} from '../services/localAvatarService';
import type { Cat, CatInsert } from '../types/database';
import './CatSetupPage.css';

const AVATAR_SIZE = 280;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  if (Math.max(pixelCrop.width, pixelCrop.height) > AVATAR_SIZE) {
    const small = document.createElement('canvas');
    small.width = AVATAR_SIZE;
    small.height = AVATAR_SIZE;
    const sctx = small.getContext('2d');
    if (sctx) {
      sctx.drawImage(canvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      dataUrl = small.toDataURL('image/jpeg', 0.85);
    }
  }
  return dataUrl;
}

interface AvatarEditorProps {
  imageUrl: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

function AvatarEditor({ imageUrl, onConfirm, onCancel }: AvatarEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaPixelsRef = useRef<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    croppedAreaPixelsRef.current = croppedAreaPixels;
  }, []);

  const handleConfirm = useCallback(async () => {
    const area = croppedAreaPixelsRef.current;
    if (!area) return;
    try {
      const dataUrl = await getCroppedImg(imageUrl, area);
      onConfirm(dataUrl);
    } catch {
      onConfirm(imageUrl);
    }
  }, [imageUrl, onConfirm]);

  return (
    <div className="avatar-editor-overlay" role="dialog" aria-modal="true" aria-label="預覽與裁切頭像">
      <div className="avatar-editor avatar-editor-fullpage">
        <h2 className="avatar-editor-title">預覽與裁切</h2>
        <p className="avatar-editor-hint">拖曳移動、雙指或按鈕縮放，圓圈內為頭像裁切範圍，確認後套用</p>
        <div className="avatar-editor-crop-container">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            minZoom={0.2}
            maxZoom={3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="avatar-editor-zoom-btns">
          <button
            type="button"
            className="avatar-editor-zoom-btn"
            aria-label="縮小"
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))}
          >
            −
          </button>
          <button
            type="button"
            className="avatar-editor-zoom-btn"
            aria-label="放大"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
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
              <div className={`cat-avatar-preview ${editorImageUrl ? 'cat-avatar-preview-hidden' : ''}`}>
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
