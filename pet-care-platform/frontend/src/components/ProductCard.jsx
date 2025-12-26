/**
 * Компонент карточки товара
 *
 * Отображает информацию о товаре для каталога магазина.
 * Автоматически определяет, добавлен ли товар в корзину.
 *
 * Поведение кнопки:
 * - Товар НЕ в корзине: Синяя кнопка "Купить" (добавляет 1 единицу)
 * - Товар В корзине: Серый блок с счетчиком количества + зеленая кнопка "В корзину"
 *
 * Логика счетчика:
 * - "+" добавляет 1 товар (макс. остаток на складе)
 * - "-" уменьшает на 1 (мин. 0 - товар удаляется из корзины)
 * - При количестве 0 появляется кнопка "Купить"
 *
 * Props:
 *   product: Объект товара с name, price, images и т.д.
 *   onAddToCart: Обработчик добавления в корзину (принимает product и quantity)
 *   isLoading: Состояние загрузки для добавления в корзину
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ButtonLoader } from './Loader'
import Rating from './Rating'
import FavoriteButton from './FavoriteButton'
import { useCartStore } from '../store/cartStore'

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
 * - Динамическими элементами управления:
 *   - Товар не в корзине: Синяя кнопка "Купить"
 *   - Товар в корзине: Серый счетчик с +/- + зеленая кнопка "В корзину"
 */
function ProductCard({ product, onAddToCart, isLoading = false }) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const { getItemInCart, addItem, updateQuantity } = useCartStore()

  // Проверяем, есть ли товар уже в корзине
  const cartItem = getItemInCart(product.id)
  const isInCart = !!cartItem
  const cartQuantity = cartItem?.quantity || 0
  
  /**
   * Обработчик клика по добавлению в корзину (добавляет 1 товар)
   */
  const handleAddToCart = async () => {
    if (isAdding || isLoading) return

    setIsAdding(true)
    try {
      const result = await onAddToCart?.(product, 1)
      // После успешного добавления кнопка изменится на "В корзину"
      // Навигация происходит только при клике на зелёную кнопку
    } finally {
      setIsAdding(false)
    }
  }

  /**
   * Обработчик изменения количества товара в корзине
   */
  const handleQuantityChange = async (delta) => {
    const newQuantity = cartQuantity + delta

    // Проверяем ограничения
    if (delta > 0 && newQuantity > (product.stock_count || 999)) {
      return // Не добавляем больше чем есть на складе
    }
    if (newQuantity < 0) {
      return // Не уменьшаем ниже 0
    }

    // Используем updateQuantity для изменения количества (включая удаление при 0)
    await updateQuantity(product.id, newQuantity)
  }

  /**
   * Обработчик клика по кнопке "К корзине"
   */
  const handleGoToCart = () => {
    navigate('/cart')
  }
  
  // Главное изображение товара
  const mainImage = product.main_image || (product.images && product.images[0])
  
  return (
    <div className="group bg-white/95 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg border border-white/20 transition-all duration-300 flex flex-col h-full overflow-hidden hover:scale-[1.02]">
      {/* Изображение товара - кликабельное */}
      <Link to={`/shop/products/${product.id}`} className="aspect-square bg-gradient-to-br from-purple-50 to-orange-50 relative overflow-hidden block">
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
            <span className="text-6xl opacity-40">
              {product.animal === 'dog' ? '🐕' : product.animal === 'cat' ? '🐱' : '🐾'}
            </span>
          </div>
        )}

        {/* Бейдж скидки */}
        {product.discount_percent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-lg font-bold shadow-lg">
            -{product.discount_percent}%
          </div>
        )}

        {/* Бейдж наличия */}
        {product.stock_count <= 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-lg shadow-lg">
            Нет в наличии
          </div>
        )}

        {/* Бейдж животного */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-white/95 backdrop-blur-sm text-xs rounded-lg font-medium border border-purple-100">
          {animalLabels[product.animal] || product.animal}
        </div>

        {/* Кнопка избранного */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <FavoriteButton itemId={product.id} type="product" size="sm" />
        </div>
      </Link>
      
      {/* Информация о товаре */}
      <div className="flex-1 flex flex-col p-4">
        {/* Бренд */}
        {product.vendor && (
          <p className="text-xs text-purple-600 font-medium mb-1 uppercase tracking-wide">
            {product.vendor}
          </p>
        )}

        {/* Название - кликабельное */}
        <Link to={`/shop/products/${product.id}`}>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm leading-snug hover:text-purple-600 transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        {/* Категория */}
        <p className="text-xs text-purple-400 mb-2">
          {categoryLabels[product.category] || product.category}
          {product.category_name && ` • ${product.category_name}`}
        </p>

        {/* Рейтинг */}
        {(product.rating || product.reviews_count !== undefined) && (
          <div className="mb-2">
            <Rating
              rating={product.rating || 0}
              reviewsCount={product.reviews_count}
              readonly={true}
              size="sm"
            />
          </div>
        )}

        {/* Вес если есть */}
        {product.weight && (
          <p className="text-xs text-purple-300 mb-2">
            Вес: {product.weight} кг
          </p>
        )}
        
        {/* Цена и добавление в корзину */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-purple-100/50">
          <div className="flex flex-col">
            {product.discount_percent > 0 ? (
              <>
                <span className="text-xs text-purple-300 line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="text-lg font-bold text-gradient bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  {formatPrice(product.discounted_price)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
            )}
            {product.stock_count > 0 && product.stock_count <= 5 && (
              <span className="text-xs text-orange-500 font-medium">
                Осталось {product.stock_count} шт.
              </span>
            )}
          </div>

          {/* Управление количеством и кнопка корзины */}
          {isInCart ? (
            /* Товар в корзине - фиолетовый счетчик и оранжевая кнопка */
            <div className="flex items-center gap-2">
              {/* Фиолетовый блок с управлением количеством */}
              <div className="flex items-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors border border-purple-200">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg"
                  title="Уменьшить количество"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">
                  {cartQuantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={cartQuantity >= (product.stock_count || 999)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg"
                  title="Увеличить количество"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Оранжевая кнопка "В корзину" */}
              <button
                onClick={handleGoToCart}
                className="text-sm py-2 px-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg flex items-center gap-1.5 transition-all duration-300 shadow-md hover:shadow-lg"
                title="Перейти в корзину"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                В корзину
              </button>
            </div>
          ) : (
            /* Товар не в корзине - градиентная кнопка "Купить" */
            <button
              onClick={handleAddToCart}
              disabled={isAdding || isLoading || product.stock_count <= 0}
              className={`text-sm py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all duration-300 shadow-md hover:shadow-lg ${
                product.stock_count <= 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white hover:scale-105'
              }`}
            >
              {isAdding ? (
                <>
                  <ButtonLoader />
                  <span>Добавление...</span>
                </>
              ) : product.stock_count <= 0 ? (
                'Нет в наличии'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Купить
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
