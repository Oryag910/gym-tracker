import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/workouts': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
      '/exercises': 'http://localhost:8000',
      '/library': 'http://localhost:8000',
      '/measurements': 'http://localhost:8000',
      '/cardio': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/templates': 'http://localhost:8000',
      '/demo': 'http://localhost:8000',
    },
  },
})
