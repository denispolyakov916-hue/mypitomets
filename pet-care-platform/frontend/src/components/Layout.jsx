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
  const { toasts, removeToast } = useToastStore()
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Навигационная шапка */}
      <Navbar />
      
      {/* Основная область контента */}
      <main className="flex-1">
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
