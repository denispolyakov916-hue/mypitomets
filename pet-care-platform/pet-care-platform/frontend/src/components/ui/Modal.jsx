/**
 * Универсальный компонент модального окна
 * 
 * Поддерживает анимации, фокус-ловушку и доступность.
 * 
 * @example
 * <Modal isOpen={isOpen} onClose={handleClose} title="Подтверждение">
 *   <p>Вы уверены, что хотите продолжить?</p>
 *   <ModalFooter>
 *     <Button variant="secondary" onClick={handleClose}>Отмена</Button>
 *     <Button onClick={handleConfirm}>Подтвердить</Button>
 *   </ModalFooter>
 * </Modal>
 */

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Размеры модального окна
 */
const sizes = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-full mx-4',
}

/**
 * Иконка закрытия
 */
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

/**
 * Основной компонент Modal
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  centered = true,
  className = '',
  overlayClassName = '',
  initialFocus,
}) {
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)
  
  /**
   * Обработка нажатия Escape
   */
  const handleEscape = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose()
    }
  }, [closeOnEscape, onClose])
  
  /**
   * Обработка клика по оверлею
   */
  const handleOverlayClick = useCallback((e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose()
    }
  }, [closeOnOverlay, onClose])
  
  /**
   * Управление фокусом и скроллом
   */
  useEffect(() => {
    if (isOpen) {
      // Сохраняем текущий активный элемент
      previousActiveElement.current = document.activeElement
      
      // Блокируем скролл body
      document.body.style.overflow = 'hidden'
      
      // Добавляем слушатель Escape
      document.addEventListener('keydown', handleEscape)
      
      // Устанавливаем фокус на модальное окно или указанный элемент
      setTimeout(() => {
        if (initialFocus?.current) {
          initialFocus.current.focus()
        } else if (modalRef.current) {
          const focusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (focusable) {
            focusable.focus()
          } else {
            modalRef.current.focus()
          }
        }
      }, 10)
      
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleEscape)
        
        // Возвращаем фокус на предыдущий элемент
        if (previousActiveElement.current) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [isOpen, handleEscape, initialFocus])
  
  /**
   * Ловушка фокуса
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !modalRef.current) return
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }, [])
  
  if (!isOpen) return null
  
  const modalContent = (
    <div
      className={`
        fixed inset-0 z-50 
        flex ${centered ? 'items-center' : 'items-start pt-16'}
        justify-center p-4
        bg-black/50 backdrop-blur-sm
        animate-fadeIn
        ${overlayClassName}
      `.trim().replace(/\s+/g, ' ')}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizes[size] || sizes.md}
          bg-white rounded-xl shadow-2xl
          animate-slideUp
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Заголовок */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="
                  p-2 -mr-2 rounded-lg
                  text-gray-400 hover:text-gray-600 hover:bg-gray-100
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                "
                aria-label="Закрыть"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        
        {/* Контент */}
        <div className="px-6 py-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
  
  // Рендерим через портал в body
  return createPortal(modalContent, document.body)
}

/**
 * Футер модального окна
 */
export const ModalFooter = ({
  children,
  className = '',
  justify = 'end',
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }
  
  return (
    <div
      className={`
        flex items-center gap-3 flex-wrap
        mt-6 pt-4 border-t border-gray-100
        ${justifyClasses[justify] || justifyClasses.end}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  )
}

/**
 * Модальное окно подтверждения
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение',
  message = 'Вы уверены, что хотите продолжить?',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger',
  isLoading = false,
}) => {
  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-secondary-500 hover:bg-secondary-600 focus:ring-secondary-500',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600">{message}</p>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="
            px-4 py-2 rounded-lg text-sm font-medium
            bg-gray-100 text-gray-700 hover:bg-gray-200
            transition-colors disabled:opacity-50
          "
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium text-white
            transition-colors disabled:opacity-50
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${variantClasses[variant] || variantClasses.primary}
          `.trim().replace(/\s+/g, ' ')}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Загрузка...
            </span>
          ) : confirmText}
        </button>
      </ModalFooter>
    </Modal>
  )
}

export default Modal

