import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { DEV_SECURITY_HEADERS, SECURITY_HEADERS } from './src/securityHeaders.js';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: DEV_SECURITY_HEADERS,
    watch: {
      // Windows locks open images and crashes the file watcher.
      ignored: ['**/*.{png,jpg,jpeg,gif,webp,bmp,ico}'],
    },
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
});
