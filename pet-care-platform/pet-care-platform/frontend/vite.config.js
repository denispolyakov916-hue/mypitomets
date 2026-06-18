/**
 * Конфигурация Vite для фронтенда Питомец+
 * 
 * Конфигурация включает:
 * - Плагин React для поддержки JSX
 * - Сервер разработки с прокси к бэкенд API
 * - Hot Module Replacement (HMR) для быстрой разработки
 */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  // URL бэкенда для прокси
  // Бэкенд на порту 8077
  const backendHost = env.VITE_BACKEND_HOST || 'localhost'
  const backendPort = env.VITE_BACKEND_PORT || '8077'
  const proxyTarget = `http://${backendHost}:${backendPort}`
  
  console.log(`[Vite] API proxy target: ${proxyTarget}`)
  
  return {
    plugins: [react()],
    
    // Конфигурация сервера разработки
    // ПОРТ 5199 - порт для фронтенда (localhost)
    // host: true — слушать 0.0.0.0 (и IPv4, и удобно для LAN). Иначе на части систем
    // при открытии http://localhost:... браузер ходит на ::1, а Vite слушал только
    // 127.0.0.1 — в Яндекс.Браузере и др. возможен «пустой экран» без явной ошибки.
    server: {
      port: 5199,
      host: true,
      strictPort: false, // Если порт занят, попробовать следующий

      // Проксирование API запросов к Django бэкенду
      // Все запросы на /api/* перенаправляются на localhost:8077
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          rewrite: (path) => path, // Оставляем путь как есть
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${proxyTarget}${req.url}`)
            })
            proxy.on('error', (err, req, res) => {
              console.error('[Vite Proxy Error]', err.message, 'for', req.url)
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`[Vite Proxy] ${req.url} -> ${proxyRes.statusCode}`)
            })
          }
        }
      }
    },
    
    // Конфигурация сборки
    build: {
      outDir: 'dist',
      sourcemap: false, // Отключить source maps в продакшене для уменьшения размера
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Удалить console.log в продакшене
          drop_debugger: true,
        },
      },
      // Разделение на chunks для оптимизации загрузки
      rollupOptions: {
        output: {
          manualChunks: {
            // React и React DOM в отдельный chunk
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Chart библиотеки
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            // D3
            'd3-vendor': ['d3'],
            // TipTap редактор
            'tiptap-vendor': [
              '@tiptap/react',
              '@tiptap/starter-kit',
              '@tiptap/extension-image',
              '@tiptap/extension-link',
              '@tiptap/pm'
            ],
            // Zustand
            'zustand-vendor': ['zustand'],
            // Axios
            'axios-vendor': ['axios'],
            // DnD Kit
            'dnd-vendor': [
              '@dnd-kit/core',
              '@dnd-kit/sortable',
              '@dnd-kit/utilities'
            ],
          },
        },
      },
      // Размер предупреждений (в KB)
      chunkSizeWarningLimit: 1000,
    }
  }
})
