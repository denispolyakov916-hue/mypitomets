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

/**
 * Русский плюрал: выбирает форму слова по числу.
 *
 * @param {number} count - Число
 * @param {[string, string, string]} forms - Формы [1, 2-4, 5+], напр. ['товар', 'товара', 'товаров']
 * @returns {string} Подходящая форма слова
 *
 * @example
 *   pluralizeRu(1, ['товар', 'товара', 'товаров'))   // 'товар'
 *   pluralizeRu(3, ['товар', 'товара', 'товаров'))   // 'товара'
 *   pluralizeRu(551, ['товар', 'товара', 'товаров')) // 'товаров'
 */
export const pluralizeRu = (count, forms) => {
  const n = Math.abs(Number(count) || 0) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

const PRODUCT_FORMS = ['товар', 'товара', 'товаров']

/**
 * «N товаров» с корректным склонением и форматированием числа.
 *
 * @param {number} count - Количество товаров
 * @returns {string} напр. «1 товар», «3 товара», «551 товар»
 */
export const formatProductCount = (count) => {
  const n = Number(count) || 0
  return `${n.toLocaleString('ru-RU')} ${pluralizeRu(n, PRODUCT_FORMS)}`
}

/**
 * Точечные исправления опечаток в названиях товаров на уровне отображения.
 *
 * Данные каталога приходят из внешнего источника и содержат единичные опечатки.
 * Исправляем их при показе, не трогая сами данные. Список консервативный —
 * только однозначные ошибки, чтобы не «починить» корректный текст.
 */
// Примечание: \b не работает как граница слова для кириллицы в JS-regex,
// поэтому используем lookahead на пробел/пунктуацию/конец строки.
const WORD_END = `(?=[\\s,.;:!?)»"']|$)`
const PRODUCT_NAME_TYPO_FIXES = [
  [new RegExp(`семянем${WORD_END}`, 'giu'), 'семенем'],
  [new RegExp(`семянами${WORD_END}`, 'giu'), 'семенами'],
]

/**
 * Возвращает название товара с исправленными опечатками (для отображения).
 *
 * @param {string} name - Исходное название товара
 * @returns {string} Название с исправленными опечатками
 */
export const cleanProductName = (name) => {
  if (!name || typeof name !== 'string') return name || ''
  let result = name
  for (const [pattern, replacement] of PRODUCT_NAME_TYPO_FIXES) {
    result = result.replace(pattern, (match) => {
      // Сохраняем регистр первой буквы оригинала
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1)
      }
      return replacement
    })
  }
  return result
}

