import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // فایل‌ها و لوگو هم باید به سرور برسند، نه فقط /api
    proxy: { '/api': API, '/files': API, '/brand': API }
  }
});
