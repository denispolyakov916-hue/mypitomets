/**
 * Компонент карточки курса
 * 
 * Отображает информацию о курсе для каталога курсов.
 * Включает функцию добавления в корзину.
 * 
 * Props:
 *   course: Объект курса с title, price, format_type и т.д.
 *   onAddToCart: Обработчик добавления в корзину
 *   onEnrollFree: Обработчик записи на бесплатный курс (открывает модальное окно)
 *   isOwned: Курс уже приобретён пользователем
 *   isInCart: Курс уже находится в корзине
 *   isLoading: Состояние загрузки для добавления в корзину
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ButtonLoader } from './Loader'
import Rating from './Rating'
import FavoriteButton from './FavoriteButton'

/**
 * Маппинг названий типов животных
 */
const petTypeLabels = {
  dog: 'Для собак',
  cat: 'Для кошек',
  all: 'Для всех',
}

/**
 * Маппинг названий категорий
 */
const categoryLabels = {
  basics: 'Основы',
  training: 'Дрессировка',
  care: 'Уход',
  health: 'Здоровье',
  nutrition: 'Питание',
  behavior: 'Поведение',
  specialized: 'Специализированные',
  entertainment: 'Развлечения',
}

/**
 * Маппинг форматов обучения
 */
const formatLabels = {
  video: 'Видео',
  text: 'Текст',
  interactive: 'Интерактивный',
  mixed: 'Смешанный',
  webinar: 'Вебинар',
  workshop: 'Мастер-класс',
}

/**
 * Маппинг уровней сложности
 */
const levelLabels = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
  expert: 'Эксперт',
}

/**
 * Форматирование цены
 */
const formatPrice = (price) => {
  if (price === 0) return 'Бесплатно'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Форматирование продолжительности
 */
const formatDuration = (minutes) => {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

/**
 * Компонент CourseCard
 */
function CourseCard({ course, onAddToCart, onEnrollFree, isOwned = false, isLoading = false, isInCart = false }) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  
  /**
   * Обработчик клика по добавлению в корзину
   */
  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isAdding || isLoading || isOwned || isInCart) return

    setIsAdding(true)
    try {
      const result = await onAddToCart?.(course)
      // После успешного добавления кнопка изменится на "В корзину"
      // Навигация происходит только при клике на зелёную кнопку
    } finally {
      setIsAdding(false)
    }
  }

  /**
   * Обработчик клика по кнопке "В корзину" (уже добавленные курсы)
   */
  const handleGoToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate('/cart')
  }
  
  /**
   * Обработчик клика по записи на бесплатный курс
   */
  const handleEnrollFree = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isOwned) return
    
    onEnrollFree?.(course)
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden group">
      {/* Изображение курса - кликабельное */}
      <Link to={`/courses/${course.id}`} className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden block">
        {course.image_url && !imageError ? (
          <img
            src={course.image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">
              {course.pet_type === 'dog' ? '🐕' : course.pet_type === 'cat' ? '🐱' : '📚'}
            </span>
          </div>
        )}
        
        {/* Бейдж бесплатного курса */}
        {course.price === 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-lg font-bold">
            Бесплатно
          </div>
        )}
        
        {/* Бейдж типа животного */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm text-xs rounded-lg font-medium">
          {petTypeLabels[course.pet_type] || course.pet_type}
        </div>
        
        {/* Бейдж формата */}
        {course.format_type && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary-600/90 backdrop-blur-sm text-white text-xs rounded-lg font-medium">
            {formatLabels[course.format_type] || course.format_type}
          </div>
        )}
        
        {/* Кнопка избранного */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <FavoriteButton itemId={course.id} type="course" size="sm" />
        </div>
      </Link>
      
      {/* Информация о курсе */}
      <div className="flex-1 flex flex-col p-4">
        {/* Категория */}
        {course.category && (
          <p className="text-xs text-primary-600 font-medium mb-1 uppercase tracking-wide">
            {categoryLabels[course.category] || course.category}
          </p>
        )}
        
        {/* Название - кликабельное */}
        <Link to={`/courses/${course.id}`}>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base leading-snug hover:text-primary-600 transition-colors">
            {course.title}
          </h3>
        </Link>
        
        {/* Описание (краткое) */}
        {course.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2 flex-1">
            {course.description}
          </p>
        )}
        
        {/* Рейтинг */}
        {(course.rating || course.reviews_count !== undefined) && (
          <div className="mb-3">
            <Rating
              rating={course.rating || 0}
              reviewsCount={course.reviews_count}
              readonly={true}
              size="sm"
            />
          </div>
        )}
        
        {/* Метаданные */}
        <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
          {course.duration && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(course.duration)}
            </span>
          )}
          {course.level && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              {levelLabels[course.level] || course.level}
            </span>
          )}
        </div>
        
        {/* Цена и добавление в корзину */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            <span className={`text-lg font-bold ${
              course.price === 0 ? 'text-green-600' : 'text-gray-900'
            }`}>
              {formatPrice(course.price)}
            </span>
          </div>
          {isOwned ? (
            <button
              onClick={() => navigate(`/training/courses/${course.id}/learn`)}
              className="text-sm py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 w-full justify-center font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12c0 4.418-4.03-8 9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              🎓 Начать обучение
            </button>
          ) : course.price === 0 ? (
            // Бесплатные курсы - открытие модального окна для записи
            <button
              onClick={handleEnrollFree}
              className="text-sm py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Получить курс
            </button>
          ) : (
            // Платные курсы - добавление в корзину
            <button
              onClick={isInCart ? handleGoToCart : handleAddToCart}
              disabled={isAdding || isLoading}
              className={`text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                isInCart
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isAdding ? (
                <>
                  <ButtonLoader />
                  <span>...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {isInCart ? 'В корзину' : 'Купить'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourseCard

