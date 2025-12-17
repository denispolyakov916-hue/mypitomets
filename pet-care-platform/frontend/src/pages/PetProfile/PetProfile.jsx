/**
 * Компонент страницы профиля питомца
 * 
 * Отображает детальную информацию об одном питомце.
 * Функции:
 * - Полное отображение информации о питомце
 * - Действия редактирования и удаления
 * - Навигация назад
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getPet, deletePet } from '../../api/pets'
import { PageLoader } from '../../components/Loader'

/**
 * Маппинг иконок видов животных
 */
const speciesIcons = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  rodent: '🐹',
  fish: '🐠',
  reptile: '🦎',
  other: '🐾'
}

/**
 * Маппинг названий видов животных
 */
const speciesLabels = {
  dog: 'Собака',
  cat: 'Кошка',
  bird: 'Птица',
  rodent: 'Грызун',
  fish: 'Рыбка',
  reptile: 'Рептилия',
  other: 'Другое'
}

/**
 * Форматирование даты в русскую локаль
 */
const formatDate = (dateString) => {
  if (!dateString) return 'Не указана'
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Компонент страницы PetProfile
 */
function PetProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pet, setPet] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка данных питомца при монтировании
   */
  useEffect(() => {
    fetchPet()
  }, [id])
  
  /**
   * Загрузка питомца из API
   */
  const fetchPet = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getPet(id)
      setPet(response.pet)
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные питомца')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик удаления
   */
  const handleDelete = async () => {
    if (!confirm(`Вы уверены, что хотите удалить профиль питомца "${pet.name}"?`)) {
      return
    }
    
    try {
      await deletePet(pet.id)
      navigate('/pets')
    } catch (err) {
      alert(err.message || 'Не удалось удалить питомца')
    }
  }
  
  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !pet) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Питомец не найден'}</p>
          <Link to="/pets" className="btn-primary">
            Вернуться к списку
          </Link>
        </div>
      </div>
    )
  }
  
  const icon = speciesIcons[pet.species] || speciesIcons.other
  const speciesLabel = speciesLabels[pet.species] || 'Питомец'
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Ссылка назад */}
      <Link 
        to="/pets" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад к списку
      </Link>
      
      {/* Карточка профиля */}
      <div className="card">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row items-start gap-6 pb-6 border-b border-gray-100">
          {/* Иконка */}
          <div className="w-24 h-24 bg-primary-50 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0">
            {icon}
          </div>
          
          {/* Кличка и вид */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {pet.name}
            </h1>
            <p className="text-lg text-gray-600">
              {speciesLabel}
              {pet.breed && ` • ${pet.breed}`}
            </p>
          </div>
          
          {/* Действия */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Link 
              to={`/pets/${pet.id}/edit`}
              className="flex-1 sm:flex-initial btn-secondary text-center"
            >
              Редактировать
            </Link>
            <button 
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
        
        {/* Сетка деталей */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          {/* Дата рождения */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Дата рождения</h3>
            <p className="text-gray-900">{formatDate(pet.date_of_birth)}</p>
          </div>
          
          {/* Вес */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Вес</h3>
            <p className="text-gray-900">
              {pet.weight ? `${pet.weight} кг` : 'Не указан'}
            </p>
          </div>
          
          {/* Вид */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Вид</h3>
            <p className="text-gray-900">{speciesLabel}</p>
          </div>
          
          {/* Порода */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Порода</h3>
            <p className="text-gray-900">{pet.breed || 'Не указана'}</p>
          </div>
          
          {/* Пол */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Пол</h3>
            <p className="text-gray-900">
              {pet.gender === 'male' ? 'Самец' : pet.gender === 'female' ? 'Самка' : 'Не указан'}
            </p>
          </div>
          
          {/* Статус кастрации */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Кастрация/Стерилизация</h3>
            <p className="text-gray-900">
              {pet.is_neutered ? 'Да' : 'Нет'}
            </p>
          </div>
          
          {/* Дата создания */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Профиль создан</h3>
            <p className="text-gray-900">{formatDate(pet.created_at)}</p>
          </div>
          
          {/* Дата обновления */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Последнее обновление</h3>
            <p className="text-gray-900">{formatDate(pet.updated_at)}</p>
          </div>
        </div>
        
        {/* Вкусовые предпочтения и аллергии */}
        {(pet.favorite_foods?.length > 0 || pet.allergies?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            {pet.favorite_foods?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Любимые продукты</h3>
                <div className="flex flex-wrap gap-2">
                  {pet.favorite_foods.map((food, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {pet.allergies?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Аллергии</h3>
                <div className="flex flex-wrap gap-2">
                  {pet.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Секция рекомендаций (заглушка) */}
      <div className="card mt-6">
        <h2 className="section-title">Рекомендации по уходу</h2>
        <p className="text-gray-600">
          Персональные рекомендации по питанию и уходу на основе данных {pet.name} 
          будут доступны в следующих версиях платформы.
        </p>
        <Link to="/shop" className="btn-primary inline-block mt-4">
          Перейти в магазин кормов
        </Link>
      </div>
    </div>
  )
}

export default PetProfile
