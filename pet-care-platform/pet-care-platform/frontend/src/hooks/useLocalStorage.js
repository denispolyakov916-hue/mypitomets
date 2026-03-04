/**
 * Хук для работы с localStorage
 * 
 * Синхронизирует состояние с localStorage с поддержкой
 * SSR и обработкой ошибок.
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light')
 * const [favorites, setFavorites] = useLocalStorage('favorites', [])
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * Хук useLocalStorage
 * 
 * @param {string} key - Ключ в localStorage
 * @param {any} initialValue - Начальное значение
 * @returns {[any, Function, Function]} [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
  // Получаем начальное значение
  const readValue = useCallback(() => {
    // Проверяем, что мы на клиенте
    if (typeof window === 'undefined') {
      return initialValue
    }
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [key, initialValue])
  
  const [storedValue, setStoredValue] = useState(readValue)
  
  /**
   * Устанавливает новое значение
   */
  const setValue = useCallback((value) => {
    try {
      // Позволяем передавать функцию как в useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        
        // Отправляем событие для синхронизации между вкладками
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(valueToStore),
        }))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])
  
  /**
   * Удаляет значение из localStorage
   */
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])
  
  /**
   * Синхронизация между вкладками
   */
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue))
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key])
  
  return [storedValue, setValue, removeValue]
}

export default useLocalStorage

