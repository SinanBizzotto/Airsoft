import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vendor-Code separat halten, damit er zwischen Deploys gecacht bleibt.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          if (/node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase'
          return undefined
        },
      },
    },
  },
})
