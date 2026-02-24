/**
 * Компонент Toast для уведомлений
 * 
 * Современная система уведомлений с автоматическим исчезновением.
 * Поддерживает разные типы: success, error, warning, info
 */

import { useEffect, useState } from 'react'

/**
 * Типы уведомлений
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

/**
 * Иконки для типов уведомлений
 */
const icons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

/**
 * Цвета для типов уведомлений
 */
const colors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-600'
  },
  warning: {
    bg: 'bg-secondary-50',
    border: 'border-secondary-200',
    text: 'text-secondary-800',
    icon: 'text-secondary-600'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600'
  }
}

/**
 * Компонент одного Toast уведомления
 */
function Toast({ message, type = TOAST_TYPES.INFO, onClose, duration = 5000, action, actionLabel }) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  
  const colorScheme = colors[type] || colors.info
  const icon = icons[type] || icons.info
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [duration])
  
  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300) // Время анимации
  }
  
  if (!isVisible) return null
  
  return (
    <div
      className={`
        ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text}
        border rounded-lg shadow-lg p-4 mb-3
        flex items-start gap-3
        min-w-[300px] max-w-[500px]
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      {/* Иконка */}
      <div className={`${colorScheme.icon} flex-shrink-0 mt-0.5`}>
        {icon}
      </div>
      
      {/* Сообщение и действие */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words">
          {message}
        </p>
        {action && (
          <button
            onClick={() => { action(); handleClose(); }}
            className="mt-1.5 text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            {actionLabel || 'Отменить'}
          </button>
        )}
      </div>
      
      {/* Кнопка закрытия */}
      <button
        onClick={handleClose}
        className={`
          ${colorScheme.icon} hover:opacity-70
          flex-shrink-0 ml-2
          transition-opacity
        `}
        aria-label="Закрыть"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Контейнер для Toast уведомлений
 */
export function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null
  
  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col items-end"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration}
          action={toast.action}
          actionLabel={toast.actionLabel}
        />
      ))}
    </div>
  )
}

/**
 * Хук для управления Toast уведомлениями
 */
let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState([])
  
  const showToast = (message, type = TOAST_TYPES.INFO, duration = 5000) => {
    const id = ++toastIdCounter
    const newToast = { id, message, type, duration }
    
    setToasts(prev => [...prev, newToast])
    
    return id
  }
  
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }
  
  const success = (message, duration) => showToast(message, TOAST_TYPES.SUCCESS, duration)
  const error = (message, duration) => showToast(message, TOAST_TYPES.ERROR, duration)
  const warning = (message, duration) => showToast(message, TOAST_TYPES.WARNING, duration)
  const info = (message, duration) => showToast(message, TOAST_TYPES.INFO, duration)
  
  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}

export default Toast

