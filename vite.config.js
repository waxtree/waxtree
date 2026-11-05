import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// The /api functions are Vercel serverless functions (their Discogs keys live
// in Vercel env vars), which plain `vite` doesn't serve — without this every
// Discogs / YouTube / cosine call 404s in local dev. Forward only the three
// the app actually calls to the deployed site; admin and delete-account
// deliberately stay unreachable from localhost. Point WAXTREE_API_TARGET at
// another deployment (e.g. a Vercel preview) to test against that instead.
const API_TARGET = process.env.WAXTREE_API_TARGET ?? 'https://waxtree.vercel.app';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '^/api/(discogs-oauth|yt-search|cosine-search)$': { target: API_TARGET, changeOrigin: true },
    },
  },
});
