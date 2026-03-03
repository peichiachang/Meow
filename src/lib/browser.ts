/**
 * 簡易偵測是否可能為 App 內建瀏覽器（WebView）。
 * Google OAuth 在 WebView 內常被擋（使用安全瀏覽器政策），
 * 偵測到時可引導使用者改在系統瀏覽器開啟登入。
 */
export function isLikelyWebView(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return false;
  const ua = navigator.userAgent;

  // 常見內建瀏覽器 / in-app 特徵
  if (/WebView|wv\)|; Mobile\/.* Safari\/|FBAN|FBAV|FBIOS|Line\//i.test(ua)) return true;
  // Android WebView 常帶 wv
  if (/Android.*wv\)/.test(ua)) return true;
  // iOS：在 WebView 裡常沒有 Safari/ 或 CriOS/FxiOS（排除一般 Chrome/Firefox）
  if (/iPhone|iPad|iPod/.test(ua) && !/Safari\/|CriOS\/|FxiOS\/|EdgiOS\//i.test(ua)) return true;

  return false;
}
