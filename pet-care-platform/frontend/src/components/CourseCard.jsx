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
import PropTypes from 'prop-types'
import { ButtonLoader } from './Loader'
import Rating from './Rating'
import FavoriteButton from './FavoriteButton'
import { CoursePropTypes } from '../utils/propTypes'
import { getCardPlaceholderImage } from '../utils/placeholderImages'

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
  const petTypeLabel = petTypeLabels[course.pet_type] || 'Для всех'
  const placeholderImage = getCardPlaceholderImage({
    title: course.title || 'Курс',
    subtitle: petTypeLabel,
    emoji: course.pet_type === 'dog' ? '🐕' : course.pet_type === 'cat' ? '🐱' : '📚',
    accent: course.pet_type === 'dog' ? '#60a5fa' : course.pet_type === 'cat' ? '#f97316' : '#a78bfa',
  })
  const imageSrc = !imageError && course.image_url ? course.image_url : placeholderImage
  
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
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 flex flex-col h-full overflow-hidden">
      {/* Изображение курса - кликабельное */}
      <Link to={`/courses/${course.id}`} className="aspect-square relative overflow-hidden bg-gray-50 block">
        <img
          src={imageSrc}
          alt={course.title}
          className="w-full h-full object-contain p-2 transition-opacity duration-300"
          loading="lazy"
          onError={() => {
            if (!imageError) setImageError(true)
          }}
        />
        
        {/* Бейджи сверху слева */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Бесплатный курс */}
          {course.price === 0 && (
            <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
              Бесплатно
            </span>
          )}
          
          {/* Формат курса */}
          {course.format_type && (
            <span className="px-2 py-0.5 bg-white/90 text-gray-700 text-[10px] font-semibold rounded shadow-sm border border-gray-200">
              {formatLabels[course.format_type] || course.format_type}
            </span>
          )}
        </div>
        
        {/* Кнопка избранного - всегда видна */}
        <div className="absolute top-2 right-2">
          <FavoriteButton itemId={course.id} type="course" size="sm" />
        </div>
        
        {/* Тип животного */}
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
            course.pet_type === 'dog' ? 'bg-blue-100 text-blue-700' :
            course.pet_type === 'cat' ? 'bg-primary-100 text-primary-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {petTypeLabel}
          </span>
        </div>
      </Link>
      
      {/* Информация о курсе */}
      <div className="flex-1 flex flex-col p-4">
        {/* Цена */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-lg font-bold ${
            course.price === 0 ? 'text-green-600' : 'text-gray-900'
          }`}>
            {formatPrice(course.price)}
          </span>
        </div>
        
        {/* Категория (как бренд в ProductCard) */}
        {course.category && (
          <p className="text-xs text-primary-700 font-semibold mb-1 truncate">
            {categoryLabels[course.category] || course.category}
          </p>
        )}
        
        {/* Название - кликабельное */}
        <Link to={`/courses/${course.id}`} className="block">
          <h3 className="text-sm text-gray-900 leading-snug line-clamp-2 hover:text-primary-700 transition-colors mb-2 min-h-[2.6rem]">
            {course.title}
          </h3>
        </Link>
        
        {/* Рейтинг и отзывы */}
        <div className="flex items-center gap-1 mb-3">
          {(course.rating || course.reviews_count !== undefined) && (
            <>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-700">
                  {(course.rating || 0).toFixed(1)}
                </span>
              </div>
              {course.reviews_count > 0 && (
                <span className="text-xs text-gray-400">
                  ({course.reviews_count})
                </span>
              )}
            </>
          )}
        </div>
        
        {/* Кнопка корзины (анимированная) */}
        <div className="mt-auto">
          {isOwned ? (
            <button
              onClick={() => navigate(`/training/courses/${course.id}/learn`)}
              className="w-full h-10 rounded-2xl flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 active:scale-[0.98]"
            >
              <span className="text-sm font-medium leading-tight">Начать обучение</span>
            </button>
          ) : course.price === 0 ? (
            // Бесплатные курсы - открытие модального окна для записи
            <button
              onClick={handleEnrollFree}
              className="w-full h-10 rounded-2xl flex flex-col items-center justify-center bg-green-600 hover:bg-green-700 text-white transition-all duration-300 active:scale-[0.98]"
            >
              <span className="text-sm font-medium leading-tight">Получить курс</span>
            </button>
          ) : (
            // Платные курсы - добавление в корзину (стиль как в магазине)
            <button
              onClick={isInCart ? handleGoToCart : handleAddToCart}
              disabled={isAdding || isLoading}
              className={`w-full h-10 rounded-2xl relative flex flex-col items-center justify-center text-white transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] overflow-hidden ${
                isInCart
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isAdding ? (
                <ButtonLoader />
              ) : (
                <>
                  {/* Текст "В корзину" / "Добавить" */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
                    isInCart ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`}>
                    <span className="text-sm font-medium leading-tight">В корзину</span>
                    <span className="text-[10px] opacity-80 leading-tight">Добавить</span>
                  </div>
                  {/* Текст "В корзине" / "Перейти" */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ease-in-out ${
                    isInCart ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}>
                    <span className="text-xs font-medium leading-tight">В корзине</span>
                    <span className="text-[10px] opacity-80 leading-tight">Перейти</span>
                  </div>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

CourseCard.propTypes = {
  course: CoursePropTypes.isRequired,
  onAddToCart: PropTypes.func,
  onEnrollFree: PropTypes.func,
  isOwned: PropTypes.bool,
  isLoading: PropTypes.bool,
  isInCart: PropTypes.bool,
}

export default CourseCard

