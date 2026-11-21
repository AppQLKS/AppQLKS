import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true, // mở được trên điện thoại cùng mạng Wi-Fi
    proxy: { '/api': 'http://localhost:4000' },
  },
});
