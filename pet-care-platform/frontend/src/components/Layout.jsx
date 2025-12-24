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
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-gray-500 text-sm">
              2024 Питомец+. Все права защищены.
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-primary-600 transition-colors">
                О проекте
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Контакты
              </a>
              <a href="#" className="hover:text-primary-600 transition-colors">
                Политика конфиденциальности
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
