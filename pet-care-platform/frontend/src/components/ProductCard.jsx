/**
 * Компонент карточки товара
 * 
 * Отображает информацию о товаре для каталога магазина.
 * Включает функцию добавления в корзину.
 * 
 * Props:
 *   product: Объект товара с name, price, description и т.д.
 *   onAddToCart: Обработчик добавления в корзину
 *   isLoading: Состояние загрузки для добавления в корзину
 */

import { useState } from 'react'
import { ButtonLoader } from './Loader'

/**
 * Маппинг названий типов животных
 */
const petTypeLabels = {
  dog: 'Для собак',
  cat: 'Для кошек',
  all: 'Универсальный'
}

/**
 * Маппинг названий типов товаров
 */
const productTypeLabels = {
  dry_food: 'Сухой корм',
  wet_food: 'Влажный корм',
  treats: 'Лакомство'
}

/**
 * Форматирование цены с символом рубля
 * @param {number} price - Цена в рублях
 * @returns {string} Форматированная строка цены
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Компонент ProductCard
 * 
 * Отображает товар с:
 * - Заглушкой изображения
 * - Названием и описанием
 * - Ценой
 * - Бейджами категорий
 * - Кнопкой добавления в корзину
 */
function ProductCard({ product, onAddToCart, isLoading = false }) {
  const [isAdding, setIsAdding] = useState(false)
  
  /**
   * Обработчик клика по добавлению в корзину
   * Показывает состояние загрузки во время обработки
   */
  const handleAddToCart = async () => {
    if (isAdding || isLoading) return
    
    setIsAdding(true)
    try {
      await onAddToCart?.(product)
    } finally {
      setIsAdding(false)
    }
  }
  
  return (
    <div className="card hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Заглушка изображения товара */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-6xl opacity-50">
          {product.pet_type === 'dog' ? '🐕' : product.pet_type === 'cat' ? '🐱' : '🐾'}
        </span>
      </div>
      
      {/* Информация о товаре */}
      <div className="flex-1 flex flex-col">
        {/* Бейджи категорий */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">
            {petTypeLabels[product.pet_type] || product.pet_type}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {productTypeLabels[product.product_type] || product.product_type}
          </span>
        </div>
        
        {/* Название и описание */}
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
          {product.description}
        </p>
        
        {/* Цена и добавление в корзину */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || isLoading || !product.in_stock}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
          >
            {isAdding ? (
              <>
                <ButtonLoader />
                <span>Добавление...</span>
              </>
            ) : !product.in_stock ? (
              'Нет в наличии'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                В корзину
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
