/**
 * Хук для работы с питомцами пользователя
 *
 * Предоставляет удобный интерфейс для получения списка питомцев
 * с управлением состоянием загрузки и ошибок.
 */

import { useState, useEffect, useCallback } from 'react'
import { getPets } from '../api/pets'
import { useAuthStore } from '../store/authStore'

/**
 * Хук для получения списка питомцев пользователя.
 *
 * Список обновляется автоматически по событию `pets:changed`, которое диспатчат
 * мутаторы api/pets.js (createPet/updatePet/deletePet/savePetDraft) — поэтому новый
 * питомец сразу появляется в хедере без перезагрузки страницы.
 *
 * @returns {Object} { pets, isLoading, error, refetch }
 */
export const usePets = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [pets, setPets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPets = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      setPets([])
      setError(null)
      return
    }
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
  }, [isAuthenticated])

  useEffect(() => {
    fetchPets()
  }, [fetchPets])

  // Обновляем список, когда питомца создали/изменили/удалили в любом месте приложения.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handlePetsChanged = () => { fetchPets() }
    window.addEventListener('pets:changed', handlePetsChanged)
    return () => window.removeEventListener('pets:changed', handlePetsChanged)
  }, [fetchPets])

  return { pets, isLoading, error, refetch: fetchPets }
}

// Default export для совместимости
export default usePets
