/**
 * Хук для работы с медиа-запросами
 * 
 * Позволяет реагировать на изменения размера экрана
 * и применять адаптивную логику в компонентах.
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)')
 * const isDesktop = useMediaQuery('(min-width: 1024px)')
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
 */

import { useState, useEffect } from 'react'

/**
 * Хук useMediaQuery
 * 
 * @param {string} query - Медиа-запрос CSS
 * @returns {boolean} Соответствует ли текущий viewport запросу
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(query).matches
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    
    const mediaQuery = window.matchMedia(query)
    
    // Обработчик изменения
    const handleChange = (event) => {
      setMatches(event.matches)
    }
    
    // Начальное значение
    setMatches(mediaQuery.matches)
    
    // Подписываемся на изменения
    // Используем addEventListener для современных браузеров
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange)
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [query])
  
  return matches
}

/**
 * Предустановленные брейкпоинты (соответствуют Tailwind CSS)
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

/**
 * Хуки для конкретных брейкпоинтов
 */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${breakpoints.md})`)
}

export function useIsTablet() {
  return useMediaQuery(`(min-width: ${breakpoints.md}) and (max-width: ${breakpoints.lg})`)
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${breakpoints.lg})`)
}

/**
 * Хук для проверки предпочтения пользователя по анимациям
 */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Хук для проверки тёмной темы системы
 */
export function usePrefersDarkMode() {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

export default useMediaQuery

