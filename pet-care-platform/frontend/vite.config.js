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
  const backendHost = env.VITE_BACKEND_HOST || 'localhost'
  const backendPort = env.VITE_BACKEND_PORT || '8000'
  const proxyTarget = `http://${backendHost}:${backendPort}`
  
  console.log(`[Vite] API proxy target: ${proxyTarget}`)
  
  return {
    plugins: [react()],
    
    // Конфигурация сервера разработки
    // ПОРТ 5199 - уникальный порт для избежания конфликтов в локальной сети
    server: {
      port: 5199,
      host: true, // Разрешить внешние подключения (доступ по IP из сети)

      // Проксирование API запросов к Django бэкенду
      // Все запросы на /api/* перенаправляются на бэкенд
      // Это позволяет избежать CORS проблем в разработке
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // Логирование прокси запросов для отладки
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('[Proxy Error]', err.message)
            })
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('[Proxy]', req.method, req.url, '->', proxyTarget + req.url)
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
