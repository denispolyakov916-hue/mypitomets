/**
 * Компонент карточки товара
 * 
 * Отображает информацию о товаре для каталога магазина.
 * Включает функцию добавления в корзину.
 * 
 * Props:
 *   product: Объект товара с name, price, images и т.д.
 *   onAddToCart: Обработчик добавления в корзину
 *   isLoading: Состояние загрузки для добавления в корзину
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ButtonLoader } from './Loader'

/**
 * Маппинг названий животных
 */
const animalLabels = {
  dog: 'Для собак',
  cat: 'Для кошек',
}

/**
 * Маппинг названий категорий
 */
const categoryLabels = {
  food: 'Корм',
  pharmacy: 'Ветаптека',
  ammunition: 'Амуниция',
  care: 'Уход',
  transport: 'Транспортировка',
  toys: 'Игрушки',
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
 * - Изображением товара
 * - Названием и брендом
 * - Ценой
 * - Бейджами категорий
 * - Кнопкой добавления в корзину
 */
function ProductCard({ product, onAddToCart, isLoading = false }) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  /**
   * Обработчик клика по добавлению в корзину
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
  
  // Главное изображение товара
  const mainImage = product.main_image || (product.images && product.images[0])
  
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
      {/* Изображение товара - кликабельное */}
      <Link to={`/shop/products/${product.id}`} className="aspect-square bg-gray-50 relative overflow-hidden block">
        {mainImage && !imageError ? (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">
              {product.animal === 'dog' ? '🐕' : product.animal === 'cat' ? '🐱' : '🐾'}
            </span>
          </div>
        )}
        
        {/* Бейдж скидки */}
        {product.discount_percent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-lg font-bold">
            -{product.discount_percent}%
          </div>
        )}
        
        {/* Бейдж наличия */}
        {product.stock_count <= 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-lg">
            Нет в наличии
          </div>
        )}
        
        {/* Бейдж животного */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 text-xs rounded-lg font-medium">
          {animalLabels[product.animal] || product.animal}
        </div>
      </Link>
      
      {/* Информация о товаре */}
      <div className="flex-1 flex flex-col p-4">
        {/* Бренд */}
        {product.vendor && (
          <p className="text-xs text-primary-600 font-medium mb-1 uppercase tracking-wide">
            {product.vendor}
          </p>
        )}
        
        {/* Название - кликабельное */}
        <Link to={`/shop/products/${product.id}`}>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm leading-snug hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {/* Категория */}
        <p className="text-xs text-gray-500 mb-3">
          {categoryLabels[product.category] || product.category}
          {product.category_name && ` • ${product.category_name}`}
        </p>
        
        {/* Вес если есть */}
        {product.weight && (
          <p className="text-xs text-gray-400 mb-2">
            Вес: {product.weight} кг
          </p>
        )}
        
        {/* Цена и добавление в корзину */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            {product.discount_percent > 0 ? (
              <>
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="text-lg font-bold text-red-600">
                  {formatPrice(product.discounted_price)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
            )}
            {product.stock_count > 0 && product.stock_count <= 5 && (
              <span className="text-xs text-orange-600 font-medium">
                Осталось {product.stock_count} шт.
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || isLoading || product.stock_count <= 0}
            className={`text-sm py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors ${
              product.stock_count <= 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isAdding ? (
              <>
                <ButtonLoader />
                <span>...</span>
              </>
            ) : product.stock_count <= 0 ? (
              'Нет'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
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
