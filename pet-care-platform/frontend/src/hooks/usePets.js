/**
 * Хук для работы с питомцами пользователя
 * 
 * Предоставляет удобный интерфейс для получения списка питомцев
 * с управлением состоянием загрузки и ошибок.
 */

import { useState, useEffect } from 'react'
import { getPets } from '../api/pets'
import { useAuthStore } from '../store/authStore'

/**
 * Хук для получения списка питомцев пользователя
 * 
 * @returns {Object} Объект с массивом питомцев, состоянием загрузки и ошибкой
 * @returns {Array} returns.pets - Массив питомцев пользователя
 * @returns {boolean} returns.isLoading - Флаг состояния загрузки
 * @returns {string|null} returns.error - Сообщение об ошибке (если есть)
 * 
 * @example
 *   const { pets, isLoading, error } = usePets()
 */
export const usePets = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [pets, setPets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      setPets([])
      return
    }
    
    const fetchPets = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await getPets()
        setPets(response.pets || [])
      } catch (err) {
        setError(err.message || 'Не удалось загрузить питомцев')
        setPets([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPets()
  }, [isAuthenticated])
  
  return { pets, isLoading, error }
}

// Default export для совместимости
export default usePets

