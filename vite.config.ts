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
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
});
