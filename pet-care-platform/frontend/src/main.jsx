/**
 * Точка входа приложения
 * 
 * Этот файл инициализирует React-приложение:
 * - Импортирует глобальные стили
 * - Рендерит корневой компонент App
 * - Оборачивает приложение в BrowserRouter для маршрутизации
 */

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore } from './store/authStore'
import './index.css'

// Компонент-обёртка для инициализации приложения
function AppWrapper() {
  return <App />
}

// Создание корня и рендеринг приложения
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
