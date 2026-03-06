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

import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import Footer from './Footer'
import PuffSupportWidget from './PuffSupportWidget'
import { ToastContainer } from './Toast'
import { useToastStore } from '../store/toastStore'

/** Единые параметры анимации переключения страниц */
const pageTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
}

/**
 * Компонент Layout, оборачивающий все страницы
 *
 * Обеспечивает единую структуру с навигацией и подвалом.
 * На главной (/) футер не показываем — лендинг в iframe уже содержит свой футер.
 */
function Layout({ children }) {
  const { pathname } = useLocation()
  const toasts = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)
  const isLanding = pathname === '/'

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      {/* Skip links для доступности */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Перейти к основному содержимому
      </a>

      {/* Навигационная шапка */}
      <Navbar />

      {/* Основная область контента с плавной сменой страниц */}
      <main id="main-content" className="flex-1 pt-[88px] md:pt-[96px]" tabIndex={-1}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
            className="min-h-[50vh]"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast уведомления */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Подвал — на главной не показываем, т.к. футер уже есть в лендинге (iframe) */}
      {!isLanding && <Footer />}

      {/* Виджет-помощник «Чат с Пуфом» — на всех страницах кроме главной (на главной виджет уже в лендинге iframe) */}
      {!isLanding && <PuffSupportWidget />}
    </div>
  )
}

export default Layout
