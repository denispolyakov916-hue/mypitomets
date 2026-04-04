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
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import MobileHomeStrip from './MobileHomeStrip'
import MobileBottomNav from './MobileBottomNav'
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
 * Футер один на всех страницах (в т.ч. главная): в iframe лендинга футер скрыт (?nofooter=1).
 */
function Layout({ children }) {
  const { pathname } = useLocation()
  const toasts = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)
  const isLanding = pathname === '/'
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const showMobileCta =
    !isAuthenticated && pathname !== '/login' && pathname !== '/register'
  const showPuffWidget =
    !isLanding || showMobileCta || (isLanding && isAuthenticated)

  /** Высота MobileHomeStrip: h-9 + градиент 1px + safe-area (см. компонент) */
  const mobileTopStripPt = 'pt-[calc(2.25rem+1px+env(safe-area-inset-top,0px))]'

  return (
    <div
      className={
        isLanding
          ? 'min-h-screen flex w-full min-w-0 flex-col overflow-x-hidden bg-[#522f81] md:bg-[#F5F5F5]'
          : 'min-h-screen flex w-full min-w-0 flex-col overflow-x-hidden bg-[#F5F5F5]'
      }
    >
      {/* Skip links для доступности */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Перейти к основному содержимому
      </a>

      {/* Мобильные: тонкая полоска «Главная»; десктоп: Navbar */}
      <MobileHomeStrip />
      <Navbar />

      {/* На мобильных отступ снизу под нижнюю панель — в т.ч. на главной, иначе навигации не видно */}
      <main
        id="main-content"
        className={
          isLanding
            ? /* Главная: не flex-1 — иначе с большим футером снаружи iframe сжимается до полоски и ломается скролл */
              `flex w-full flex-shrink-0 flex-col ${mobileTopStripPt} pb-0 md:pt-[88px] md:pb-0 lg:pt-[96px]`
            : showMobileCta
              ? `flex min-h-0 flex-1 flex-col ${mobileTopStripPt} pb-[calc(10.25rem+env(safe-area-inset-bottom))] md:pt-[88px] md:pb-0 lg:pt-[96px]`
              : `flex min-h-0 flex-1 flex-col ${mobileTopStripPt} pb-[calc(7rem+env(safe-area-inset-bottom))] md:pt-[88px] md:pb-0 lg:pt-[96px]`
        }
        tabIndex={-1}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
            className={
              isLanding
                ? 'flex w-full min-w-0 flex-shrink-0 flex-col overflow-x-hidden'
                : 'flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden'
            }
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast уведомления */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <Footer />

      {/* Чат с Пуфом: на внутренних страницах всегда; на главной — вместо дубля в iframe (embed) */}
      {showPuffWidget && (
        <PuffSupportWidget stackGuestStrip={showMobileCta} />
      )}

      {/* Нижняя навигация на мобильных — на главной тоже (верхний Navbar там скрыт) */}
      <MobileBottomNav />
    </div>
  )
}

export default Layout
