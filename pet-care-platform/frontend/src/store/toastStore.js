/**
 * Хранилище Toast уведомлений (Zustand)
 * 
 * Глобальное управление уведомлениями для всего приложения.
 */

import { create } from 'zustand'

/**
 * Типы уведомлений (дублируем здесь чтобы избежать циклических импортов)
 */
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

let toastIdCounter = 0

export const useToastStore = create((set) => ({
  toasts: [],
  
  /**
   * Показать уведомление
   * 
   * @param {string} message - Текст уведомления
   * @param {string} type - Тип уведомления (success, error, warning, info)
   * @param {number|Object} optionsOrDuration - Длительность в мс или объект опций
   * @param {number} [optionsOrDuration.duration=5000] - Длительность показа
   * @param {Function} [optionsOrDuration.action] - Callback для кнопки действия (например, undo)
   * @param {string} [optionsOrDuration.actionLabel] - Текст кнопки действия
   * @returns {number} ID уведомления
   */
  showToast: (message, type = TOAST_TYPES.INFO, optionsOrDuration = 5000) => {
    const options = typeof optionsOrDuration === 'number'
      ? { duration: optionsOrDuration }
      : (optionsOrDuration || {})
    const { duration = 5000, action, actionLabel } = options
    const id = ++toastIdCounter
    const newToast = { id, message, type, duration, action, actionLabel }
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))
    
    return id
  },
  
  /**
   * Удалить уведомление
   * 
   * @param {number} id - ID уведомления
   */
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }))
  },
  
  /**
   * Удобные методы для разных типов уведомлений
   */
  success: (message, optionsOrDuration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.SUCCESS, optionsOrDuration)
  },
  
  error: (message, optionsOrDuration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.ERROR, optionsOrDuration)
  },
  
  warning: (message, optionsOrDuration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.WARNING, optionsOrDuration)
  },
  
  info: (message, optionsOrDuration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.INFO, optionsOrDuration)
  }
}))

