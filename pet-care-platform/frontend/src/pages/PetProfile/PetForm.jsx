/**
 * Компонент страницы формы питомца
 * 
 * Форма создания или редактирования профиля питомца.
 * Определяет режим работы по параметрам URL.
 * 
 * Маршруты:
 * - /pets/new - Создание нового питомца
 * - /pets/:id/edit - Редактирование существующего питомца
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPet, updatePet, getPet, SPECIES_OPTIONS } from '../../api/pets'
import { PageLoader, ButtonLoader } from '../../components/Loader'

/**
 * Компонент страницы PetForm
 * 
 * Функции:
 * - Валидация формы
 * - Режим редактирования с предзаполнением данных
 * - Режим создания для новых питомцев
 * - Навигация отмены
 */
function PetForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    date_of_birth: '',
    weight: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(isEditMode)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка данных питомца в режиме редактирования
   */
  useEffect(() => {
    if (isEditMode) {
      fetchPet()
    }
  }, [id, isEditMode])
  
  /**
   * Загрузка данных питомца для редактирования
   */
  const fetchPet = async () => {
    setIsFetching(true)
    setError(null)
    
    try {
      const response = await getPet(id)
      const pet = response.pet
      
      setFormData({
        name: pet.name || '',
        species: pet.species || 'dog',
        breed: pet.breed || '',
        date_of_birth: pet.date_of_birth || '',
        weight: pet.weight ? String(pet.weight) : ''
      })
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные питомца')
    } finally {
      setIsFetching(false)
    }
  }
  
  /**
   * Валидация полей формы
   */
  const validateForm = () => {
    const errors = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Введите кличку питомца'
    }
    
    if (!formData.species) {
      errors.species = 'Выберите вид животного'
    }
    
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) <= 0)) {
      errors.weight = 'Введите корректный вес'
    }
    
    if (formData.date_of_birth) {
      const date = new Date(formData.date_of_birth)
      if (date > new Date()) {
        errors.date_of_birth = 'Дата рождения не может быть в будущем'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  /**
   * Обработчик изменения поля ввода
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Очистка ошибки поля при изменении
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }))
    }
  }
  
  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setError(null)
    
    // Подготовка данных (конвертация веса в число если указан)
    const petData = {
      name: formData.name.trim(),
      species: formData.species,
      breed: formData.breed.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      weight: formData.weight ? parseFloat(formData.weight) : null
    }
    
    try {
      if (isEditMode) {
        await updatePet(id, petData)
      } else {
        await createPet(petData)
      }
      
      navigate('/pets')
    } catch (err) {
      setError(err.message || 'Не удалось сохранить данные')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Состояние загрузки в режиме редактирования
  if (isFetching) {
    return <PageLoader />
  }
  
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
      
      <div className="max-w-xl">
        {/* Заголовок */}
        <h1 className="page-title">
          {isEditMode ? 'Редактирование питомца' : 'Добавить питомца'}
        </h1>
        
        {/* Карточка формы */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Серверная ошибка */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            {/* Кличка */}
            <div>
              <label htmlFor="name" className="label">
                Кличка <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${validationErrors.name ? 'input-error' : ''}`}
                placeholder="Как зовут вашего питомца?"
                disabled={isLoading}
              />
              {validationErrors.name && (
                <p className="error-message">{validationErrors.name}</p>
              )}
            </div>
            
            {/* Вид животного */}
            <div>
              <label htmlFor="species" className="label">
                Вид животного <span className="text-red-500">*</span>
              </label>
              <select
                id="species"
                name="species"
                value={formData.species}
                onChange={handleChange}
                className={`input ${validationErrors.species ? 'input-error' : ''}`}
                disabled={isLoading}
              >
                {SPECIES_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {validationErrors.species && (
                <p className="error-message">{validationErrors.species}</p>
              )}
            </div>
            
            {/* Порода */}
            <div>
              <label htmlFor="breed" className="label">
                Порода
              </label>
              <input
                type="text"
                id="breed"
                name="breed"
                value={formData.breed}
                onChange={handleChange}
                className="input"
                placeholder="Например: Лабрадор"
                disabled={isLoading}
              />
            </div>
            
            {/* Дата рождения */}
            <div>
              <label htmlFor="date_of_birth" className="label">
                Дата рождения
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className={`input ${validationErrors.date_of_birth ? 'input-error' : ''}`}
                max={new Date().toISOString().split('T')[0]}
                disabled={isLoading}
              />
              {validationErrors.date_of_birth && (
                <p className="error-message">{validationErrors.date_of_birth}</p>
              )}
            </div>
            
            {/* Вес */}
            <div>
              <label htmlFor="weight" className="label">
                Вес (кг)
              </label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className={`input ${validationErrors.weight ? 'input-error' : ''}`}
                placeholder="Например: 25.5"
                min="0.1"
                max="500"
                step="0.1"
                disabled={isLoading}
              />
              {validationErrors.weight && (
                <p className="error-message">{validationErrors.weight}</p>
              )}
            </div>
            
            {/* Кнопки отправки */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ButtonLoader />
                    Сохранение...
                  </>
                ) : (
                  isEditMode ? 'Сохранить изменения' : 'Добавить питомца'
                )}
              </button>
              
              <Link 
                to="/pets" 
                className="btn-secondary py-3 px-6"
              >
                Отмена
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PetForm
