/**
 * Хранилище Toast уведомлений (Zustand)
 * 
 * Глобальное управление уведомлениями для всего приложения.
 */

import { create } from 'zustand'
import { TOAST_TYPES } from '../components/Toast'

let toastIdCounter = 0

export const useToastStore = create((set) => ({
  toasts: [],
  
  /**
   * Показать уведомление
   * 
   * @param {string} message - Текст уведомления
   * @param {string} type - Тип уведомления (success, error, warning, info)
   * @param {number} duration - Длительность показа в мс (0 = не исчезает)
   * @returns {number} ID уведомления
   */
  showToast: (message, type = TOAST_TYPES.INFO, duration = 5000) => {
    const id = ++toastIdCounter
    const newToast = { id, message, type, duration }
    
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
  success: (message, duration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.SUCCESS, duration)
  },
  
  error: (message, duration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.ERROR, duration)
  },
  
  warning: (message, duration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.WARNING, duration)
  },
  
  info: (message, duration) => {
    return useToastStore.getState().showToast(message, TOAST_TYPES.INFO, duration)
  }
}))

