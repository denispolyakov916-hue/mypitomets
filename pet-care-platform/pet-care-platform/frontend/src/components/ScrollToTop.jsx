/**
 * Компонент ScrollToTop
 *
 * Автоматически прокручивает страницу наверх при изменении маршрута.
 * Решает проблему сохранения позиции прокрутки в React Router.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    console.log('🔄 ScrollToTop: Route changed to', pathname + search)
    console.log('📍 Current scroll position:', window.scrollY)

    // Мгновенная прокрутка наверх (игнорирует scroll-behavior: smooth из CSS)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    // Множественные проверки и попытки сброса прокрутки
    const checkScroll = () => {
      if (window.scrollY > 0) {
        console.warn('⚠️ ScrollToTop: Scroll position was not reset, trying again!')
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        // Принудительная установка через DOM
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      } else {
        console.log('✅ ScrollToTop: Scroll position reset successfully')
      }
    }

    // Проверки с разными задержками
    setTimeout(checkScroll, 10)
    setTimeout(checkScroll, 50)
    setTimeout(checkScroll, 100)
    setTimeout(checkScroll, 200)

    // Специальная обработка для payment страниц
    if (pathname === '/payment') {
      console.log('🎯 Special handling for payment page')
      const paymentScrollFix = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        document.documentElement.scrollLeft = 0
        document.body.scrollLeft = 0
        console.log('💳 Payment page scroll fix applied')
      }

      setTimeout(paymentScrollFix, 150)
      setTimeout(paymentScrollFix, 300)
      setTimeout(paymentScrollFix, 500)
    }

    // Дополнительная проверка после загрузки страницы
    const handleLoad = () => {
      setTimeout(checkScroll, 300)
    }

    window.addEventListener('load', handleLoad)

    return () => {
      window.removeEventListener('load', handleLoad)
    }
  }, [pathname, search]) // Добавили search в зависимости

  return null
}

export default ScrollToTop
