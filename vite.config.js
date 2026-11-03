import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev:api` serves /api locally (or use `vercel dev` instead)
    proxy: { '/api': 'http://localhost:3001' },
  },
})
