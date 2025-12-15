/**
 * Точка входа приложения
 * 
 * Этот файл инициализирует React-приложение:
 * - Импортирует глобальные стили
 * - Рендерит корневой компонент App
 * - Оборачивает приложение в BrowserRouter для маршрутизации
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Создание корня и рендеринг приложения
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
