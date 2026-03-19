import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    // Note: Environment variables with VITE_ prefix are automatically exposed to the client
    // No need for manual define - just use import.meta.env.VITE_* in your code
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
});

