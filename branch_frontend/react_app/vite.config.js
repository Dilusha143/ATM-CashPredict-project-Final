import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth/login':               { target: apiTarget, changeOrigin: true },
      '/auth/logout':              { target: apiTarget, changeOrigin: true },
      '/auth/me':                  { target: apiTarget, changeOrigin: true },
      '/auth/register':            { target: apiTarget, changeOrigin: true },
      '/auth/login-history':       { target: apiTarget, changeOrigin: true },
      '/predict':                  { target: apiTarget, changeOrigin: true },
      '/history':                  { target: apiTarget, changeOrigin: true },
      '/atm_stats':                { target: apiTarget, changeOrigin: true },
      '/missing_dates':            { target: apiTarget, changeOrigin: true },
      '/health':                   { target: apiTarget, changeOrigin: true },
      '/poya/calendar':            { target: apiTarget, changeOrigin: true },
      '/poya/check':               { target: apiTarget, changeOrigin: true },
      '/poya/predict':             { target: apiTarget, changeOrigin: true },
      '/poya/year_predictions':    { target: apiTarget, changeOrigin: true },
      '/special/check':            { target: apiTarget, changeOrigin: true },
      '/special/predict':          { target: apiTarget, changeOrigin: true },
      '/special/christmas':        { target: apiTarget, changeOrigin: true },
      '/special/sinhala_new_year': { target: apiTarget, changeOrigin: true },
      '/special/sinhala_predict':  { target: apiTarget, changeOrigin: true },
      '/forecast/week':            { target: apiTarget, changeOrigin: true },
      '/alerts/cash_levels':       { target: apiTarget, changeOrigin: true },
      '/alerts/check':             { target: apiTarget, changeOrigin: true },
      '/report/weekly':            { target: apiTarget, changeOrigin: true },
      '/report/preview':           { target: apiTarget, changeOrigin: true },
    }
  },
  build: { outDir: '../static/react_dist', emptyOutDir: true }
})
