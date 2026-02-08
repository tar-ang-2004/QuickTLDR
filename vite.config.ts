import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';

// Plugin to remove window references from service worker bundles
function stripWindowReferences(): Plugin {
  return {
    name: 'strip-window-references',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName === 'background.js' && chunk.type === 'chunk') {
          // Replace window.dispatchEvent with a safe no-op for service workers
          chunk.code = chunk.code.replace(
            /window\.dispatchEvent/g,
            '(typeof window !== "undefined" ? window.dispatchEvent : (() => {}))'
          );
        }
      }
    }
  };
}

export default defineConfig({
  publicDir: 'public',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        privacy: resolve(__dirname, 'public/privacy.html'),
        overlayUI: resolve(__dirname, 'src/overlay/overlayUI.ts'),
        highlight: resolve(__dirname, 'src/overlay/highlight.ts'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name === 'popup.css') {
            return 'assets/popup.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  },
  plugins: [stripWindowReferences()]
});
