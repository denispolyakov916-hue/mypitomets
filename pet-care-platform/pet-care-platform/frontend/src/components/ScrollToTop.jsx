/**
 * Компонент ScrollToTop
 *
 * Прокручивает страницу наверх при СМЕНЕ СТРАНИЦЫ (pathname).
 * Важно: НЕ реагирует на смену query-параметров (фильтры магазина, табы),
 * иначе страница прыгает наверх при каждом клике по фильтру.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Мгновенная прокрутка наверх (игнорирует scroll-behavior: smooth из CSS)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    // Пара подстраховочных проверок на случай асинхронного рендера контента
    const reset = () => {
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      }
    }
    const t1 = setTimeout(reset, 50)
    const t2 = setTimeout(reset, 150)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [pathname]) // только смена страницы, не фильтров

  return null
}

export default ScrollToTop
