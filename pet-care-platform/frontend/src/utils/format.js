/**
 * Утилиты для форматирования данных
 */

/**
 * Форматирование цены
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Форматирование цены курса (0 → «Бесплатно»)
 */
export const formatCoursePrice = (price) => {
  if (price === 0) return 'Бесплатно'
  return formatPrice(price)
}

