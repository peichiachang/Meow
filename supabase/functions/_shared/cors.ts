/**
 * CORS 設定輔助函數
 * 支援開發環境（localhost）和生產環境（透過環境變數設定）
 */

// 允許的來源列表（從環境變數讀取，以逗號分隔）
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map(o => o.trim()) || [];

// 預設允許的開發環境來源
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',  // Vite 預設開發伺服器
  'http://localhost:3000',  // 常見的開發端口
  'http://localhost:5174',  // Vite 備用端口
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * 取得允許的來源列表
 */
function getAllowedOrigins(): string[] {
  // 如果設定了環境變數，使用環境變數
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS;
  }
  // 否則使用預設開發環境來源
  return DEFAULT_DEV_ORIGINS;
}

/**
 * 檢查請求來源是否在允許列表中
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.some(allowedOrigin => {
    // 支援精確匹配和通配符（例如：*.vercel.app）
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return origin === allowedOrigin;
  });
}

/**
 * 取得 CORS headers
 * @param requestOrigin 請求的 Origin header 值
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  
  // 如果沒有設定允許的來源，或請求來源在允許列表中，使用該來源
  // 否則使用第一個允許的來源（或 '*' 作為後備）
  let allowedOrigin: string;
  if (allowedOrigins.length === 0) {
    // 沒有設定任何限制，允許所有來源（開發環境）
    allowedOrigin = '*';
  } else if (requestOrigin && isOriginAllowed(requestOrigin)) {
    // 請求來源在允許列表中，使用該來源
    allowedOrigin = requestOrigin;
  } else {
    // 請求來源不在允許列表中，使用第一個允許的來源
    allowedOrigin = allowedOrigins[0];
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-meow-secret, x-cron-secret',
    'Access-Control-Max-Age': '86400', // 24 小時
  };
}
