/**
 * Утилиты форматирования российского номера телефона.
 *
 * Разделяем то, что ВИДИТ пользователь, и то, что УХОДИТ на бэкенд:
 *   - formatPhoneDisplay → «+7 (XXX) XXX-XX-XX» для поля ввода;
 *   - normalizePhone     → «+7XXXXXXXXXX» (только цифры с +7) для запроса.
 *
 * Бэкенд (normalize_phone) принимает нормализованную форму без изменений.
 */

/**
 * Вытаскивает максимум 10 значащих цифр российского номера из произвольного
 * ввода. Ведущая 8 или 7 (код страны) отбрасывается, остаётся 10-значный
 * национальный номер.
 *
 * @param {string} value - Сырой ввод (может содержать +, скобки, пробелы, дефисы)
 * @returns {string} До 10 цифр национального номера
 */
export const extractPhoneDigits = (value) => {
  // Снимаем ЛИТЕРАЛЬНЫЙ код страны в НАЧАЛЕ строки («+7», «7» или «8») ДО того,
  // как выкинуть остальные не-цифры. Иначе цифра «7» из отображаемого префикса
  // «+7» считалась бы национальной и при вводе/удалении «съедала» бы номер
  // (это и была причина «дичи» и лишней семёрки). Национальная часть после
  // префикса сохраняется как есть — даже если начинается с 7 или 8.
  const withoutCountry = String(value ?? '').replace(/^[\s+]*[78]/, '')
  const digits = withoutCountry.replace(/\D/g, '')
  return digits.slice(0, 10)
}

/**
 * Форматирует ввод в маску «+7 (XXX) XXX-XX-XX», достраивая ровно столько
 * символов, сколько цифр уже введено. Для пустого ввода возвращает '' —
 * чтобы плейсхолдер оставался видимым.
 *
 * @param {string} value - Сырой ввод
 * @returns {string} Отформатированная строка для отображения
 */
export const formatPhoneDisplay = (value) => {
  const digits = extractPhoneDigits(value)
  if (digits.length === 0) return ''

  let out = '+7'
  if (digits.length > 0) out += ' (' + digits.slice(0, 3)
  if (digits.length >= 3) out += ')'
  if (digits.length > 3) out += ' ' + digits.slice(3, 6)
  if (digits.length > 6) out += '-' + digits.slice(6, 8)
  if (digits.length > 8) out += '-' + digits.slice(8, 10)

  return out
}

/**
 * Нормализует ввод к виду «+7XXXXXXXXXX» (только цифры с +7) для отправки
 * на бэкенд. Если набрано меньше 10 цифр — возвращает то, что есть, с +7,
 * чтобы валидация на форме отловила недобор.
 *
 * @param {string} value - Сырой ввод
 * @returns {string} Нормализованный номер «+7XXXXXXXXXX»
 */
export const normalizePhone = (value) => {
  const digits = extractPhoneDigits(value)
  return '+7' + digits
}

/**
 * Полностью ли введён номер (ровно 10 национальных цифр).
 *
 * @param {string} value - Сырой ввод
 * @returns {boolean}
 */
export const isPhoneComplete = (value) => extractPhoneDigits(value).length === 10
