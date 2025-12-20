/**
 * Конфигурация Vite для фронтенда Питомец+
 * 
 * Конфигурация включает:
 * - Плагин React для поддержки JSX
 * - Сервер разработки с прокси к бэкенд API
 * - Hot Module Replacement (HMR) для быстрой разработки
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Конфигурация сервера разработки
  server: {
    port: 5173,
    host: true, // Разрешить внешние подключения (для Docker)
    
    // Проксирование API запросов к Django бэкенду
    // Это позволяет избежать CORS проблем в разработке
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
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
})
