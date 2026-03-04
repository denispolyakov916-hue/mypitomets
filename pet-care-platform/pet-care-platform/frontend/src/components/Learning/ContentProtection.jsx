/**
 * ContentProtection - Компонент защиты контента от копирования
 *
 * Реализует многоуровневую защиту:
 * - CSS: user-select: none (запрет выделения текста)
 * - JS: блокировка contextmenu, copy, cut, selectstart
 * - JS: блокировка Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+P, Ctrl+U, F12
 * - JS: попытка перехвата PrintScreen (keyup keyCode=44)
 * - Водяной знак: полупрозрачный паттерн с email/ID пользователя
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * Watermark - Водяной знак с данными пользователя
 *
 * @param {string} userId - ID пользователя
 * @param {string} userEmail - Email пользователя
 */
function Watermark({ userId, userEmail }) {
  const text = userEmail || `ID: ${userId || 'unknown'}`

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 10 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'>
              <text x='50%' y='50%' font-family='Arial,sans-serif' font-size='14' fill='rgba(0,0,0,0.04)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30, 150, 100)'>${text}</text>
            </svg>`
          )}")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  )
}

/**
 * ContentProtection - Обёртка для защищённого контента
 *
 * @param {React.ReactNode} children - Дочерние элементы (контент курса)
 * @param {string} userId - ID пользователя
 * @param {string} userEmail - Email пользователя
 * @param {boolean} [enabled=true] - Включить/выключить защиту
 * @param {boolean} [showWatermark=true] - Показывать водяной знак
 * @param {string} [className] - Дополнительные CSS классы
 */
function ContentProtection({
  children,
  userId,
  userEmail,
  enabled = true,
  showWatermark = true,
  className = '',
}) {
  const containerRef = useRef(null)

  /**
   * Блокировка клавиатурных сочетаний
   */
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return

    // Блокируем Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+P, Ctrl+U
    if (e.ctrlKey || e.metaKey) {
      const blockedKeys = ['c', 'a', 's', 'p', 'u']
      if (blockedKeys.includes(e.key.toLowerCase())) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    // Блокируем F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault()
      return false
    }

    // Блокируем Ctrl+Shift+I (DevTools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      return false
    }
  }, [enabled])

  /**
   * Попытка перехвата PrintScreen
   */
  const handleKeyUp = useCallback((e) => {
    if (!enabled) return

    // PrintScreen keyCode = 44
    if (e.keyCode === 44 || e.key === 'PrintScreen') {
      // Пытаемся затемнить экран
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: black; z-index: 99999; opacity: 1;
      `
      document.body.appendChild(overlay)

      // Пытаемся очистить буфер обмена
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {})
      }

      // Убираем затемнение
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay)
        }
      }, 200)
    }
  }, [enabled])

  /**
   * Блокировка контекстного меню (ПКМ)
   */
  const handleContextMenu = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    return false
  }, [enabled])

  /**
   * Блокировка копирования
   */
  const handleCopy = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    // Заменяем содержимое буфера
    if (e.clipboardData) {
      e.clipboardData.setData('text/plain', '')
    }
    return false
  }, [enabled])

  /**
   * Блокировка выделения
   */
  const handleSelectStart = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    return false
  }, [enabled])

  /**
   * Блокировка вырезания
   */
  const handleCut = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    return false
  }, [enabled])

  /**
   * Блокировка drag операций
   */
  const handleDragStart = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    return false
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const el = containerRef.current
    if (!el) return

    // Привязываем обработчики к контейнеру
    el.addEventListener('contextmenu', handleContextMenu)
    el.addEventListener('copy', handleCopy)
    el.addEventListener('cut', handleCut)
    el.addEventListener('selectstart', handleSelectStart)
    el.addEventListener('dragstart', handleDragStart)

    // Клавиатурные обработчики — на document (для перехвата)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      el.removeEventListener('contextmenu', handleContextMenu)
      el.removeEventListener('copy', handleCopy)
      el.removeEventListener('cut', handleCut)
      el.removeEventListener('selectstart', handleSelectStart)
      el.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [enabled, handleContextMenu, handleCopy, handleCut, handleSelectStart, handleDragStart, handleKeyDown, handleKeyUp])

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Контент курса */}
      {children}

      {/* Водяной знак */}
      {showWatermark && (
        <Watermark userId={userId} userEmail={userEmail} />
      )}
    </div>
  )
}

export { Watermark }
export default ContentProtection
