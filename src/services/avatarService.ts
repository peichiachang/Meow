/**
 * 貓咪頭像上傳至 Supabase Storage
 * 需在 Supabase 後台建立 bucket「cat-avatars」並設為 public（或設定 RLS 允許上傳／讀取）
 */
import { supabase } from '../lib/supabase';

const BUCKET = 'cat-avatars';
const MAX_SIZE_MB = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getExtension(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

export async function uploadCatAvatar(
  userId: string,
  catId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`圖片請勿超過 ${MAX_SIZE_MB}MB`);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('請上傳 JPG、PNG、WebP 或 GIF 圖片');
  }

  const ext = getExtension(file.type);
  const path = `${userId}/${catId}/avatar.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
