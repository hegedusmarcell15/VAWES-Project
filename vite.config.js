import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const pagesBasePath = process.env.VITE_BASE_PATH
const base = pagesBasePath
  ? `/${pagesBasePath.replace(/^\/+|\/+$/g, '')}/`
  : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/backend/**', '**/bin/**', '**/obj/**'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        upload: fileURLToPath(new URL('./upload.html', import.meta.url)),
      },
    },
  },
})
