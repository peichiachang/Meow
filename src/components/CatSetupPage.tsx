import { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { PERSONALITY_LABELS } from '../data/personalities';
import {
  getCatAvatarLocal,
  saveCatAvatarLocal,
  DEFAULT_AVATAR_PATHS,
  fetchImageAsDataUrl,
} from '../services/localAvatarService';
import type { CatStatus } from '../types/database';

// 預設顯示第一張貓咪預設圖
const DEFAULT_AVATAR_URL = DEFAULT_AVATAR_PATHS[0];
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
  const [age, setAge] = useState<number | ''>('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [preferences, setPreferences] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [habits, setHabits] = useState('');
  const [selfRef, setSelfRef] = useState('');
  const [status, setStatus] = useState<CatStatus>('Living');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [showDefaultAvatarModal, setShowDefaultAvatarModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setShowUploadMenu(false);
      }
    };

    if (showUploadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUploadMenu]);

  const isEditMode = !!initialCat;

  useEffect(() => {
    if (initialCat) {
      setCatName(initialCat.cat_name);
      setAge(initialCat.age ?? '');
      setPersonality(initialCat.personality ?? []);
      setPreferences(initialCat.preferences ?? '');
      setDislikes(initialCat.dislikes ?? '');
      setHabits(initialCat.habits ?? '');
      setSelfRef(initialCat.self_ref ?? '');
      setStatus(initialCat.status || 'Living');
      setAvatarDataUrl(getCatAvatarLocal(initialCat.id) ?? initialCat.avatar_url ?? null);
    } else {
      // 新增模式：預設顯示第一張預設圖
      setStatus('Living');
      setAvatarDataUrl(DEFAULT_AVATAR_URL);
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
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setShowUploadMenu(false);
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


  const handleSelectDefaultAvatar = async (path: string) => {
    setError('');
    try {
      const dataUrl = await fetchImageAsDataUrl(path);
      setAvatarDataUrl(dataUrl);
      setShowDefaultAvatarModal(false);
    } catch {
      setError('預設頭像載入失敗，請重試');
    }
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

    if (personality.length === 0) {
      setError('請至少選擇一個個性');
      return;
    }

    const ageNum = age === '' ? null : Number(age);
    const payload: CatSetupFormData = {
      cat_name: catName.trim(),
      breed: null,
      age: ageNum != null && Number.isFinite(ageNum) ? ageNum : null,
      personality: personality,
      preferences: preferences.trim() || null,
      dislikes: dislikes.trim() || null,
      habits: habits.trim() || null,
      self_ref: selfRef.trim() || null,
      status: status,
      avatar_url: initialCat?.avatar_url ?? null,
    };

    setLoading(true);
    try {
      if (isEditMode && onUpdate && initialCat) {
        // 只有當 avatarDataUrl 是 data URL 時才保存到 localStorage
        if (avatarDataUrl && avatarDataUrl.startsWith('data:')) {
          saveCatAvatarLocal(initialCat.id, avatarDataUrl);
        }
        await onUpdate(initialCat.id, payload);
        onBack?.();
      } else {
        const created = await onSubmit(payload);
        // 只有當 avatarDataUrl 是 data URL 時才保存到 localStorage
        // 如果是預設圖路徑，需要轉換為 data URL
        if (avatarDataUrl) {
          if (avatarDataUrl.startsWith('data:')) {
            saveCatAvatarLocal(created.id, avatarDataUrl);
          } else if (avatarDataUrl.startsWith('/')) {
            // 預設圖路徑，轉換為 data URL
            try {
              const dataUrl = await fetchImageAsDataUrl(avatarDataUrl);
              saveCatAvatarLocal(created.id, dataUrl);
            } catch (err) {
              console.warn('[CatSetupPage] 預設圖轉換失敗', err);
            }
          }
        }
        onBack?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '儲存失敗';
      setError(msg);
      console.error('[CatSetupPage] 儲存失敗', err);
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
      <p className="cat-setup-sub">AI 會依照這些設定模擬牠說話</p>
      <h1 className="cat-setup-title">{isEditMode ? '編輯貓咪' : '設定你的貓咪檔案'}</h1>
      <div className="cat-setup-card">

        {editorImageUrl && (
          <AvatarEditor
            imageUrl={editorImageUrl}
            onConfirm={handleEditorConfirm}
            onCancel={handleEditorCancel}
          />
        )}

        {showDefaultAvatarModal && (
          <div className="default-avatar-modal-overlay" role="dialog" aria-modal="true" aria-label="選擇預設頭像">
            <div className="default-avatar-modal">
              <h2 className="default-avatar-modal-title">選擇預設頭像</h2>
              <div className="default-avatar-modal-grid" role="listbox" aria-label="預設頭像選項">
                {DEFAULT_AVATAR_PATHS.map((path, i) => (
                  <button
                    key={path}
                    type="button"
                    className="default-avatar-modal-btn"
                    onClick={() => handleSelectDefaultAvatar(path)}
                    title={`預設頭像 ${i + 1}`}
                    aria-label={`選擇預設頭像 ${i + 1}`}
                  >
                    <img src={path} alt={`預設頭像 ${i + 1}`} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="default-avatar-modal-close"
                onClick={() => setShowDefaultAvatarModal(false)}
              >
                取消
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="cat-setup-form">
          <div className="form-group cat-avatar-upload">
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
                aria-label="從相簿選擇照片"
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                onChange={handleAvatarChange}
                className="cat-avatar-input"
                aria-label="拍照"
                style={{ display: 'none' }}
              />
              <div className="cat-avatar-actions">
                <div className="cat-avatar-actions-buttons">
                  <div className="cat-avatar-upload-menu-wrapper" ref={uploadMenuRef}>
                    <button
                      type="button"
                      className="cat-avatar-btn-secondary"
                      onClick={() => setShowUploadMenu(!showUploadMenu)}
                    >
                      上傳照片
                    </button>
                    {showUploadMenu && (
                      <div className="cat-avatar-upload-menu">
                        <button
                          type="button"
                          className="cat-avatar-menu-item"
                          onClick={() => {
                            cameraInputRef.current?.click();
                            setShowUploadMenu(false);
                          }}
                        >
                          拍照
                        </button>
                        <button
                          type="button"
                          className="cat-avatar-menu-item"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowUploadMenu(false);
                          }}
                        >
                          從相簿選擇
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="cat-avatar-btn-secondary"
                    onClick={() => setShowDefaultAvatarModal(true)}
                  >
                    選擇預設圖
                  </button>
                </div>
                <p className="cat-avatar-hint">建議 JPG、PNG、WebP 或 GIF，單檔 3 MB 以內</p>
              </div>
            </div>
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
            <span>年齡（歲）</span>
            <input
              type="number"
              min={0}
              max={30}
              step="0.1"
              value={age}
              onChange={(e) =>
                setAge(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="例如：0.5（幼貓）、1、3"
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
            <span>狀態</span>
            <div className="status-selector">
              <button
                type="button"
                className={`status-btn ${status === 'Living' ? 'active' : ''}`}
                onClick={() => setStatus('Living')}
              >
                一般模式
              </button>
              <button
                type="button"
                className={`status-btn ${status === 'Angel' ? 'active' : ''}`}
                onClick={() => setStatus('Angel')}
              >
                天使模式
              </button>
            </div>
            <p className="status-hint">
              {status === 'Angel' 
                ? '選擇「天使模式」表示貓咪已離世，對話將轉為心靈守護模式，移除所有生理需求描述。'
                : '「一般模式」適用於現有的貓咪，包含完整的生理需求與互動。'}
            </p>
          </div>

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
