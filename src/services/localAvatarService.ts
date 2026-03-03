/**
 * 貓咪頭像僅存於本機（localStorage），不上傳伺服器。
 * 以 data URL 儲存，顯示時優先讀取本機頭像。
 */

const KEY_PREFIX = 'meow:cat-avatar:';

export function saveCatAvatarLocal(catId: string, dataUrl: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + catId, dataUrl);
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      console.warn('[localAvatar] 儲存空間已滿，請選擇較小的圖片');
    }
    throw e;
  }
}

export function getCatAvatarLocal(catId: string): string | null {
  return localStorage.getItem(KEY_PREFIX + catId);
}

export function removeCatAvatarLocal(catId: string): void {
  localStorage.removeItem(KEY_PREFIX + catId);
}

/**
 * 顯示用：優先本機頭像，沒有再用伺服器 avatar_url（若日後有）
 */
export function getCatDisplayAvatar(cat: { id: string; avatar_url?: string | null }): string | null {
  return getCatAvatarLocal(cat.id) ?? cat.avatar_url ?? null;
}

/** 預設頭像路徑（public/avatars 下），供設定頁選擇 */
export const DEFAULT_AVATAR_PATHS: string[] = [
  '/avatars/cat_default_1.png',
  '/avatars/cat_default_2.png',
  '/avatars/cat_default_3.png',
  '/avatars/cat_default_4.png',
  '/avatars/cat_default_5.png',
  '/avatars/cat_default_6.png',
  '/avatars/cat_default_7.png',
  '/avatars/cat_default_8.png',
];

/**
 * 將遠端或 public 圖片 URL 轉成 data URL（用於預設頭像選擇後存本機）
 */
export function fetchImageAsDataUrl(url: string, maxSizePx = 320): Promise<string> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('無法載入圖片');
      return res.blob();
    })
    .then((blob) => {
      return new Promise<string>((resolve, reject) => {
        const img = document.createElement('img');
        const objectUrl = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const scale = w > h ? maxSizePx / w : maxSizePx / h;
          const width = scale >= 1 ? w : Math.round(w * scale);
          const height = scale >= 1 ? h : Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法建立 canvas'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/png'));
          } catch {
            reject(new Error('圖片轉換失敗'));
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('無法讀取圖片'));
        };
        img.src = objectUrl;
      });
    });
}

/**
 * 將 File 轉成 data URL（可選壓縮以節省空間）
 */
export function fileToDataUrl(file: File, maxSizePx = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = w > h ? maxSizePx / w : maxSizePx / h;
      const width = scale >= 1 ? w : Math.round(w * scale);
      const height = scale >= 1 ? h : Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('無法建立 canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch {
        reject(new Error('圖片轉換失敗'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('無法讀取圖片'));
    };
    img.src = url;
  });
}
