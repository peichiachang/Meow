/**
 * 應用設定
 * 對話次數限制：設為 0 或未設為不限次數（需重啟 dev / 重新 build 才會生效）
 */

const raw = import.meta.env.VITE_DAILY_MESSAGE_LIMIT;
const trimmed = typeof raw === 'string' ? raw.trim() : raw;
const parsed =
  trimmed === undefined || trimmed === ''
    ? undefined
    : parseInt(trimmed, 10);

/** 每日訊息上限，0 或未設 = 不限次數 */
export const DAILY_MESSAGE_LIMIT: number | null =
  parsed === undefined || Number.isNaN(parsed) || parsed <= 0 ? null : parsed;

export const isMessageLimitEnabled = (): boolean => DAILY_MESSAGE_LIMIT != null;
