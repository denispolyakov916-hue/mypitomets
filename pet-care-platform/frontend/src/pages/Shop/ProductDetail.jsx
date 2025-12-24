/**
 * Компонент страницы детального просмотра товара
 * 
 * Отображает полную информацию о товаре:
 * - Изображения
 * - Название и описание
 * - Характеристики
 * - Цена и наличие
 * - Кнопка добавления в корзину
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProduct, addToCart, getFrequentlyBoughtTogether } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import Rating from '../../components/Rating'
import ReviewsSection from '../../components/ReviewsSection'

/**
 * Форматирование цены
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Компонент страницы ProductDetail
 */
function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { refreshCart } = useCartStore()
  const { success, error: showError } = useToastStore()
  
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [isPurchased, setIsPurchased] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  
  /**
   * Загрузка данных товара
   */
  useEffect(() => {
    fetchProduct()
  }, [id])
  
  /**
   * Загрузка товара из API
   */
  const fetchProduct = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getProduct(id)
      setProduct(response.product)
      setIsPurchased(response.is_purchased || false)

      // Загружаем рекомендации
      fetchRecommendations()
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные товара')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Загрузка рекомендаций "Часто покупают вместе"
   */
  const fetchRecommendations = async () => {
    setIsLoadingRecommendations(true)
    try {
      const response = await getFrequentlyBoughtTogether(id)
      setRecommendations(response.recommendations || [])
    } catch (err) {
      // Не показываем ошибку для рекомендаций, просто оставляем пустой список
      setRecommendations([])
    } finally {
      setIsLoadingRecommendations(false)
    }
  }
  
  /**
   * Обработчик добавления в корзину
   */
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    
    setIsAddingToCart(true)
    try {
      await addToCart(product.id, quantity)
      await refreshCart()
      success('Товар добавлен в корзину. Перейдите в корзину для оформления заказа.', 5000)
    } catch (err) {
      showError(err.message || 'Не удалось добавить товар в корзину')
    } finally {
      setIsAddingToCart(false)
    }
  }
  
  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !product) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Товар не найден'}</p>
          <Link to="/shop" className="btn-primary">
            Вернуться в магазин
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Ссылка назад */}
      <Link 
        to="/shop" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад в магазин
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Изображения */}
        <div>
          {product.images && product.images.length > 0 ? (
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(1, 5).map((img, idx) => (
                    <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={img} 
                        alt={`${product.name} ${idx + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-6xl">📦</span>
            </div>
          )}
        </div>
        
        {/* Информация о товаре */}
        <div className="space-y-6">
          {/* Название и категория */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                {product.animal === 'dog' ? 'Для собак' : 'Для кошек'}
              </span>
              {product.category_name && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  {product.category_name}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            {product.vendor && (
              <p className="text-lg text-gray-600">
                Бренд: {product.vendor}
              </p>
            )}
            {/* Рейтинг */}
            {(product.rating || product.reviews_count !== undefined) && (
              <div className="mt-3">
                <Rating
                  rating={product.rating || 0}
                  reviewsCount={product.reviews_count}
                  readonly={true}
                  size="md"
                />
              </div>
            )}
          </div>
          
          {/* Цена и наличие */}
          <div className="border-t border-b border-gray-200 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                {product.discount_percent > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-gray-400 line-through">
                        {formatPrice(product.price)}
                      </span>
                      <span className="px-2 py-1 bg-red-500 text-white text-sm rounded-lg font-bold">
                        -{product.discount_percent}%
                      </span>
                    </div>
                    <span className="text-3xl font-bold text-red-600">
                      {formatPrice(product.discounted_price)}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
              {product.in_stock ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  В наличии
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                  Нет в наличии
                </span>
              )}
            </div>
            {product.stock_count > 0 && (
              <p className="text-sm text-gray-500">
                На складе: <span className={`font-medium ${product.stock_count <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                  {product.stock_count} шт.
                </span>
              </p>
            )}
          </div>
          
          {/* Описание */}
          {product.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Описание</h2>
              <p className="text-gray-600 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
          
          {/* Характеристики */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Характеристики</h2>
            <div className="space-y-2">
              {product.weight && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Вес</span>
                  <span className="text-gray-900 font-medium">{product.weight} кг</span>
                </div>
              )}
              {product.vendor_code && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Артикул</span>
                  <span className="text-gray-900 font-medium">{product.vendor_code}</span>
                </div>
              )}
              {product.barcode && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Штрихкод</span>
                  <span className="text-gray-900 font-medium">{product.barcode}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Добавление в корзину */}
          <div className="space-y-4 pt-4">
            {product.stock_count > 0 ? (
              <>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Количество:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product.stock_count || 999}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock_count || 999, parseInt(e.target.value) || 1)))}
                      className="w-20 text-center border border-gray-300 rounded-lg py-2"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(product.stock_count || 999, quantity + 1))}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {isAddingToCart ? (
                    <>
                      <ButtonLoader />
                      Добавление...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Добавить в корзину
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                disabled
                className="w-full btn-secondary py-3 opacity-50 cursor-not-allowed"
              >
                Товар недоступен
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Секция отзывов */}
      <ReviewsSection
        type="product"
        itemId={product.id}
        isPurchased={isPurchased}
      />

      {/* Рекомендации "Часто покупают вместе" */}
      {recommendations.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Часто покупают вместе</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.map((rec) => (
              <div key={rec.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <Link to={`/shop/product/${rec.id}`}>
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {rec.main_image ? (
                      <img
                        src={rec.main_image}
                        alt={rec.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">📦</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <Link to={`/shop/product/${rec.id}`}>
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-primary-600 transition-colors">
                      {rec.name}
                    </h3>
                  </Link>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col">
                      {rec.discount_percent > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice(rec.price)}
                            </span>
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg font-bold">
                              -{rec.discount_percent}%
                            </span>
                          </div>
                          <span className="text-lg font-bold text-red-600">
                            {formatPrice(rec.discounted_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(rec.price)}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rec.animal === 'dog' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {rec.animal === 'dog' ? 'Собаки' : 'Кошки'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2 capitalize">{rec.category}</p>
                  {rec.rating > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <Rating rating={rec.rating} size="sm" readonly={true} />
                      <span className="text-sm text-gray-500">({rec.reviews_count})</span>
                    </div>
                  )}
                  <Link
                    to={`/shop/product/${rec.id}`}
                    className="w-full btn-secondary py-2 text-center block text-sm"
                  >
                    Посмотреть товар
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetail

