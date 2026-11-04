import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { razorpayDevApiPlugin } from './server/razorpayDevApi.js';
import { DEV_SECURITY_HEADERS, SECURITY_HEADERS } from './src/securityHeaders.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Expose non-VITE payment secrets to the dev middleware only (not the browser bundle).
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), razorpayDevApiPlugin()],
    server: {
      port: 5174,
      headers: DEV_SECURITY_HEADERS,
    },
    preview: {
      headers: SECURITY_HEADERS,
    },
  };
});
