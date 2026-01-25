/**
 * =============================================================================
 * ЦЕНТРАЛЬНЫЙ ЭКСПОРТ ХУКОВ
 * =============================================================================
 * 
 * Этот файл экспортирует все пользовательские хуки приложения.
 * 
 * СОДЕРЖИМОЕ:
 * - useDebounce, useDebouncedCallback: дебаунсинг
 * - useLocalStorage: работа с localStorage
 * - useMediaQuery и производные: адаптивность
 * - usePets: работа с питомцами
 * - useChartData: данные для графиков (простой)
 * - useOptimizedChartData: данные для графиков (с кэшем)
 * - useMetricsLibrary: библиотека метрик для аналитики
 * - learning/*: хуки для обучения
 * 
 * ИСПОЛЬЗУЕТСЯ В:
 * - Все компоненты фронтенда
 * - Admin панель
 * =============================================================================
 */

// Утилитарные хуки
export { useDebounce, useDebouncedCallback } from './useDebounce'
export { useLocalStorage } from './useLocalStorage'
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  breakpoints,
} from './useMediaQuery'

// Хуки для работы с данными
export { usePets } from './usePets'

// Хуки для аналитики (Admin)
// export { useChartData } from './useChartData' // УДАЛЕН - не используется
export { useOptimizedChartData } from './useOptimizedChartData'
export { useMetricsLibrary } from './useMetricsLibrary'

// Хуки для обучения
export { useLessonTimer, useProgress } from './learning'
