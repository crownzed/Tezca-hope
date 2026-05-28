import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

const apiProxyTarget = `http://127.0.0.1:${process.env.VITE_API_PROXY_PORT || process.env.PORT || 3001}`;
const wsProxyTarget = apiProxyTarget.replace(/^http/, 'ws');

const apiProxy = {
  target: apiProxyTarget,
  changeOrigin: true,
  configure(proxy) {
    proxy.on('error', (_err, _req, res) => {
      if (res && !res.headersSent && typeof res.writeHead === 'function') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'API local chưa chạy. Chạy: npm run dev:all',
          }),
        );
      }
    });
  },
};

const apiProxyPort = String(process.env.VITE_API_PROXY_PORT || process.env.PORT || 3001);

export default defineConfig({
  /** Đặt VITE_BASE_PATH=/tezca/ khi phục vụ tại http://localhost/tezca/ (không dùng virtual host). */
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    'import.meta.env.VITE_API_PROXY_PORT': JSON.stringify(apiProxyPort),
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiProxy,
      '/ws': { target: wsProxyTarget, ws: true },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    /** Giống dev: preview phục vụ static nhưng vẫn proxy /api và /ws tới API */
    proxy: {
      '/api': apiProxy,
      '/ws': { target: wsProxyTarget, ws: true },
    },
  },
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
