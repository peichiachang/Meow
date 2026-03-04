/**
 * 應用設定
 * 對話次數限制：設為 0 或未設為不限次數（需重啟 dev / 重新 build 才會生效）
 * 預設為 20 則（每個帳號每天，貓咪加總計算）
 */

const raw = import.meta.env.VITE_DAILY_MESSAGE_LIMIT;
const trimmed = typeof raw === 'string' ? raw.trim() : raw;
const parsed =
  trimmed === undefined || trimmed === ''
    ? undefined
    : parseInt(trimmed, 10);

/** 每日訊息上限，0 或未設 = 使用預設值 20，null = 不限次數 */
export const DAILY_MESSAGE_LIMIT: number | null =
  parsed === undefined || Number.isNaN(parsed)
    ? null // 使用預設值 20（在 useMessageLimit 中處理）
    : parsed <= 0
    ? null // 0 或負數 = 不限次數
    : parsed;

/** 例外帳號列表（不受訊息限制），以逗號分隔的 user_id */
const rawExemptUsers = import.meta.env.VITE_EXEMPT_USER_IDS;
const exemptUserIds: string[] = rawExemptUsers
  ? rawExemptUsers.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0)
  : [];

export const EXEMPT_USER_IDS = exemptUserIds;

export const isMessageLimitEnabled = (): boolean => DAILY_MESSAGE_LIMIT != null;
