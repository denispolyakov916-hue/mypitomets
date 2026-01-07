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
  // Используем IPv4 адрес компьютера для корректной работы в локальной сети
  const backendHost = env.VITE_BACKEND_HOST || '192.168.1.11'
  const backendPort = env.VITE_BACKEND_PORT || '8077'
  const proxyTarget = `http://${backendHost}:${backendPort}`
  
  console.log(`[Vite] API proxy target: ${proxyTarget}`)
  
  return {
    plugins: [react()],
    
    // Конфигурация сервера разработки
    // ПОРТ 5199 - уникальный порт для избежания конфликтов в локальной сети
    server: {
      port: 5199,
      host: '0.0.0.0', // Слушать на всех интерфейсах (включая IPv4)
      strictPort: false, // Если порт занят, попробовать следующий

      // Проксирование API запросов к Django бэкенду
      // Все запросы на /api/* перенаправляются на бэкенд
      // Это позволяет избежать CORS проблем в разработке
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false, // Отключаем WebSocket прокси
          // Не переписываем путь - оставляем /api/* как есть
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Proxy Request]', req.method, req.url)
              console.log('[Proxy Target]', proxyTarget + req.url)
              console.log('[Proxy Headers]', {
                'host': proxyReq.getHeader('host'),
                'origin': req.headers.origin,
                'user-agent': req.headers['user-agent']
              })
            })
            proxy.on('error', (err, req, res) => {
              console.error('[Proxy Error]', err.message)
              console.error('[Proxy Error] Code:', err.code)
              console.error('[Proxy Error] Target:', proxyTarget)
              console.error('[Proxy Error] Request URL:', req.url)
            })
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('[Proxy Response]', req.url, 'Status:', proxyRes.statusCode)
            })
          }
        }
      }
    },
    
    // Конфигурация сборки
    build: {
      outDir: 'dist',
      sourcemap: true, // Включить source maps для отладки
    }
  }
})
