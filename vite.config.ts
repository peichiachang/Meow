import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** 建置時寫入 version.json 並注入 __BUILD_VERSION__，供登入後檢查新版本用 */
function versionPlugin() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now());
  return {
    name: 'version',
    config() {
      return { define: { __BUILD_VERSION__: JSON.stringify(version) } };
    },
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir || 'dist';
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ version })
      );
      const indexPath = path.join(outDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        html = html.replace(/data-version="__BUILD_VERSION__"/, `data-version="${version}"`);
        fs.writeFileSync(indexPath, html);
      }
      const refreshHtml = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Refresh" content="0; url=/?v=${version}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>載入最新版…</title>
  <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff7ed;color:#57534e;}p{margin:0.5rem 0;}a{color:#ea580c;}</style>
</head>
<body>
  <p>正在載入最新版…</p>
  <p>若未自動跳轉，<a href="/?v=${version}">請點此</a>。</p>
</body>
</html>`;
      fs.writeFileSync(path.join(outDir, 'refresh.html'), refreshHtml);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
});
