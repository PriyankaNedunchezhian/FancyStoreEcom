import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Windows locks open images and crashes the file watcher.
      ignored: ['**/*.{png,jpg,jpeg,gif,webp,bmp,ico}'],
    },
  },
});
