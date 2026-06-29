/**
 * Утилиты работы с датами.
 *
 * ВАЖНО про toLocalISODate: НЕ используем Date.prototype.toISOString().split('T')[0]
 * для дат рождения и подобных «календарных» значений. toISOString() переводит дату
 * в UTC, поэтому для пользователей в +03 (МСК) полночь местного дня уезжает на
 * предыдущую дату — дата рождения сохранялась бы на день раньше выбранной.
 * Здесь берём локальные компоненты (getFullYear/getMonth/getDate), сдвига нет.
 */

/**
 * Форматирует Date в строку `YYYY-MM-DD` по ЛОКАЛЬНОМУ времени (без сдвига в UTC).
 *
 * @param {Date|string|number|null|undefined} date - Дата (Date, ISO-строка или timestamp)
 * @returns {string|null} `YYYY-MM-DD` либо null, если входное значение пустое/невалидное
 */
export function toLocalISODate(date) {
  if (date == null) return null
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
