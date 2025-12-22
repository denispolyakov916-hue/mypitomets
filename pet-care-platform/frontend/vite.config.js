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
  
  // Извлекаем URL бэкенда из переменной окружения
  // Если VITE_API_URL установлен, используем его (убираем /api для target)
  // Иначе используем localhost по умолчанию
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000/api'
  const proxyTarget = apiUrl.replace('/api', '') || 'http://localhost:8000'
  
  return {
    plugins: [react()],
    
    // Конфигурация сервера разработки
    server: {
      port: 5173,
      host: true, // Разрешить внешние подключения (для Docker)
      
      // Проксирование API запросов к Django бэкенду
      // Используем переменную окружения VITE_API_URL или fallback на localhost
      // Это позволяет избежать CORS проблем в разработке
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
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
