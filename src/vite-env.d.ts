/// <reference types="vite/client" />

/** 建置時由 Vite 注入，用於與 /version.json 比對是否為新版本 */
declare const __BUILD_VERSION__: string;
