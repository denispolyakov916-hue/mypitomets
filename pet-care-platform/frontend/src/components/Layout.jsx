/**
 * Компонент Layout
 * 
 * Основной layout-обёртка приложения, предоставляющая:
 * - Постоянную навигационную шапку
 * - Основную область контента
 * - Подвал
 * 
 * Используется как обёртка для всех страниц в App.jsx
 * 
 * Props:
 *   children - Содержимое страницы для отображения в основной области
 */

import Navbar from './Navbar'
import Footer from './Footer'
import { ToastContainer } from './Toast'
import { useToastStore } from '../store/toastStore'

/**
 * Компонент Layout, оборачивающий все страницы
 * 
 * Обеспечивает единую структуру с навигацией и подвалом.
 * Использует min-h-screen для прижатия подвала к низу.
 */
function Layout({ children }) {
  const toasts = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Skip links для доступности */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Перейти к основному содержимому
      </a>
      
      {/* Навигационная шапка */}
      <Navbar />
      
      {/* Основная область контента */}
      <main id="main-content" className="flex-1 pt-20" tabIndex={-1}>
        {children}
      </main>
      
      {/* Toast уведомления */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Подвал */}
      <Footer />
    </div>
  )
}

export default Layout
