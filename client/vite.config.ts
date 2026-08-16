import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Dev-only: proxy /api to the backend so the app works even without a
  // VITE_API_URL .env file. Production builds still use VITE_API_URL.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split heavy vendor deps into separate, cache-stable chunks.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/react-router')) return 'vendor-router'
          if (id.includes('node_modules/@tanstack/react-query')) return 'vendor-query'
        },
      },
    },
    // Enable CSS code-splitting so each lazy route gets only its own styles
    cssCodeSplit: true,
    // Target modern browsers for smaller output
    target: 'es2020',
  },
})

