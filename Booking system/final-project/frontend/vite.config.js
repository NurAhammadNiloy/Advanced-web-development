import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
    watch: {
      usePolling: true,
    },
  },
})
