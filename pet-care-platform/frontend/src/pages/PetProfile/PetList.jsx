/**
 * Компонент страницы списка питомцев
 * 
 * Отображает всех питомцев текущего пользователя.
 * Функции:
 * - Сетка карточек питомцев
 * - Кнопка добавления нового питомца
 * - Пустое состояние при отсутствии питомцев
 * - Состояние загрузки
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPets, deletePet } from '../../api/pets'
import PetCard from '../../components/PetCard'
import { PageLoader } from '../../components/Loader'

/**
 * Компонент страницы PetList
 * 
 * Загружает и отображает питомцев пользователя.
 * Предоставляет навигацию для добавления/редактирования/просмотра питомцев.
 */
function PetList() {
  const navigate = useNavigate()
  const [pets, setPets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка питомцев при монтировании компонента
   */
  useEffect(() => {
    fetchPets()
  }, [])
  
  /**
   * Загрузка всех питомцев из API
   */
  const fetchPets = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getPets()
      setPets(response.pets || [])
    } catch (err) {
      setError(err.message || 'Не удалось загрузить питомцев')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик редактирования питомца
   */
  const handleEdit = (pet) => {
    navigate(`/pets/${pet.id}/edit`)
  }
  
  /**
   * Обработчик удаления питомца
   */
  const handleDelete = async (pet) => {
    if (!confirm(`Вы уверены, что хотите удалить профиль питомца "${pet.name}"?`)) {
      return
    }
    
    try {
      await deletePet(pet.id)
      setPets(prev => prev.filter(p => p.id !== pet.id))
    } catch (err) {
      alert(err.message || 'Не удалось удалить питомца')
    }
  }
  
  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchPets} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="page-title mb-0">Мои питомцы</h1>
          <p className="text-gray-600 mt-1">
            {pets.length > 0 
              ? `У вас ${pets.length} ${pets.length === 1 ? 'питомец' : 'питомца'}` 
              : 'Добавьте своего первого питомца'}
          </p>
        </div>
        
        <Link to="/pets/new" className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить питомца
        </Link>
      </div>
      
      {/* Пустое состояние */}
      {pets.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🐾</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            У вас пока нет питомцев
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Создайте профиль вашего питомца, чтобы получать персональные 
            рекомендации по кормам и уходу
          </p>
          <Link to="/pets/new" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить питомца
          </Link>
        </div>
      )}
      
      {/* Сетка питомцев */}
      {pets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map(pet => (
            <PetCard 
              key={pet.id} 
              pet={pet}
              showActions={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PetList
