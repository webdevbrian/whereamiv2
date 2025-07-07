import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {
      GOOGLE_API_KEY: JSON.stringify(process.env.GOOGLE_API_KEY)
    }
  }
})