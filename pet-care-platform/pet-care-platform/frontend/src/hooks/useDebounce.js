/**
 * Хук для дебаунса значения
 * 
 * Задерживает обновление значения до тех пор, пока пользователь
 * не прекратит изменять его на указанное время.
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 * 
 * useEffect(() => {
 *   // Вызывается только через 300мс после последнего изменения
 *   fetchSearchResults(debouncedSearch)
 * }, [debouncedSearch])
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Хук useDebounce
 * 
 * @param {any} value - Значение для дебаунса
 * @param {number} delay - Задержка в миллисекундах
 * @returns {any} Дебаунсированное значение
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])
  
  return debouncedValue
}

/**
 * Хук useDebouncedCallback
 * 
 * Возвращает дебаунсированную версию функции.
 * 
 * @example
 * const handleSearch = useDebouncedCallback((query) => {
 *   fetchResults(query)
 * }, 300)
 * 
 * @param {Function} callback - Функция для дебаунса
 * @param {number} delay - Задержка в миллисекундах
 * @returns {Function} Дебаунсированная функция
 */
export function useDebouncedCallback(callback, delay = 300) {
  const callbackRef = useRef(callback)
  const timerRef = useRef(null)
  
  // Обновляем ref при изменении callback
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])
  
  return useCallback((...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay])
}

export default useDebounce

