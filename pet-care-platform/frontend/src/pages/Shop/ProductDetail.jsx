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

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProduct, getProductV2, addToCart, getFrequentlyBoughtTogether, getProductBreedRecommendations } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import Rating from '../../components/Rating'
import ReviewsSection from '../../components/ReviewsSection'
import RecommendationBlock from '../../components/RecommendationBlock'

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
 * Получение URL изображения из различных форматов
 */
const getImageUrl = (image) => {
  if (!image) return null
  if (typeof image === 'string') return image
  if (typeof image === 'object') {
    return image.url || image.src || image.image_url || null
  }
  return null
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
  const [selectedSku, setSelectedSku] = useState(null)
  const [breedRecommendations, setBreedRecommendations] = useState([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  
  // Вычисляем текущую цену с учётом выбранного SKU
  const currentPrice = useMemo(() => {
    if (selectedSku) {
      return {
        price: selectedSku.price,
        compare_price: selectedSku.compare_price,
        available: selectedSku.available,
        stock: selectedSku.stock_quantity
      }
    }
    return {
      price: product?.price || 0,
      compare_price: product?.compare_price,
      available: product?.is_available ?? product?.in_stock,
      stock: product?.stock_count
    }
  }, [product, selectedSku])
  
  /**
   * Загрузка данных товара
   */
  useEffect(() => {
    fetchProduct()
  }, [id])
  
  /**
   * Загрузка товара из API
   * Пробуем сначала V2 API, затем fallback на legacy
   */
  const fetchProduct = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Пробуем V2 API с полными данными (включая SKU)
      let response
      try {
        response = await getProductV2(id)
      } catch {
        // Fallback на legacy API
        response = await getProduct(id)
      }
      
      const productData = response.product || response
      setProduct(productData)
      setIsPurchased(response.is_purchased || false)
      
      // Устанавливаем дефолтный SKU если есть
      if (productData.skus && productData.skus.length > 0) {
        const defaultSku = productData.skus.find(s => s.is_default) || productData.skus[0]
        setSelectedSku(defaultSku)
      }

      // Загружаем рекомендации параллельно
      fetchRecommendations()
      fetchBreedRecommendations()
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные товара')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Загрузка рекомендаций для пород
   */
  const fetchBreedRecommendations = async () => {
    try {
      const response = await getProductBreedRecommendations(id)
      setBreedRecommendations(response.recommendations || [])
    } catch {
      // Не показываем ошибку
      setBreedRecommendations([])
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
    
    // Проверяем доступность выбранного SKU
    if (selectedSku && !selectedSku.available) {
      showError('Выбранная вариация недоступна')
      return
    }
    
    setIsAddingToCart(true)
    try {
      // Передаём sku_id если выбран SKU
      await addToCart(product.id, quantity, selectedSku?.id || null)
      await refreshCart()
      
      // Формируем сообщение с информацией о вариации
      const skuInfo = selectedSku?.name || selectedSku?.weight_display 
        ? ` (${selectedSku.name || selectedSku.weight_display})` 
        : ''
      success(`Товар${skuInfo} добавлен в корзину. Перейдите в корзину для оформления заказа.`, 5000)
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
        {/* Галерея изображений */}
        <div className="space-y-4">
          {/* Главное изображение */}
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
            {(() => {
              // Получаем все URL изображений
              const imageUrls = []
              if (product.image_url) imageUrls.push(product.image_url)
              if (product.images && product.images.length > 0) {
                product.images.forEach(img => {
                  const url = getImageUrl(img)
                  if (url && !imageUrls.includes(url)) imageUrls.push(url)
                })
              }
              
              if (imageUrls.length === 0) {
                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-8xl opacity-40">📦</span>
                  </div>
                )
              }
              
              const currentImage = imageUrls[selectedImageIndex] || imageUrls[0]
              
              return (
                <>
                  <img 
                    src={currentImage} 
                    alt={product.name}
                    className="w-full h-full object-contain p-4"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = ''
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-8xl opacity-40">📦</span></div>'
                    }}
                  />
                  
                  {/* Стрелки навигации */}
                  {imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : imageUrls.length - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Индикатор текущего изображения */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {imageUrls.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === selectedImageIndex 
                                ? 'bg-purple-600 w-4' 
                                : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
          
          {/* Миниатюры */}
          {(() => {
            const imageUrls = []
            if (product.image_url) imageUrls.push(product.image_url)
            if (product.images && product.images.length > 0) {
              product.images.forEach(img => {
                const url = getImageUrl(img)
                if (url && !imageUrls.includes(url)) imageUrls.push(url)
              })
            }
            
            if (imageUrls.length <= 1) return null
            
            return (
              <div className="grid grid-cols-5 gap-2">
                {imageUrls.slice(0, 5).map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === selectedImageIndex 
                        ? 'border-purple-500 ring-2 ring-purple-200' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </button>
                ))}
              </div>
            )
          })()}
        </div>
        
        {/* Информация о товаре */}
        <div className="space-y-6">
          {/* Название и категория */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Тип животного */}
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                {product.animal_type === 'dog' || product.animal === 'dog' 
                  ? 'Для собак' 
                  : product.animal_type === 'cat' || product.animal === 'cat'
                    ? 'Для кошек'
                    : 'Для всех'}
              </span>
              
              {/* Категория */}
              {(product.category?.name || product.category_name) && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  {product.category?.name || product.category_name}
                </span>
              )}
              
              {/* Бейджи особенностей корма */}
              {product.is_veterinary && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                  ⚕️ Ветеринарная диета
                </span>
              )}
              {product.is_hypoallergenic && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  🛡️ Гипоаллергенный
                </span>
              )}
              {product.is_grain_free && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                  🌾 Беззерновой
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            
            {/* Бренд */}
            {(product.brand?.name || product.vendor) && (
              <p className="text-lg text-gray-600">
                Бренд: <span className="font-medium">{product.brand?.name || product.vendor}</span>
                {product.brand?.brand_class === 'super_premium' && (
                  <span className="ml-2 text-sm text-purple-600">★ Супер-премиум</span>
                )}
                {product.brand?.brand_class === 'premium' && (
                  <span className="ml-2 text-sm text-blue-600">★ Премиум</span>
                )}
              </p>
            )}
            
            {/* Возрастная и размерная группа */}
            <div className="flex flex-wrap gap-2 mt-2">
              {product.age_group && product.age_group !== 'all' && (
                <span className="text-sm text-gray-600">
                  🎂 {product.age_group === 'puppy' ? 'Для щенков' : 
                     product.age_group === 'kitten' ? 'Для котят' :
                     product.age_group === 'adult' ? 'Для взрослых' : 
                     product.age_group === 'senior' ? 'Для пожилых' : product.age_group}
                </span>
              )}
              {product.size_group && product.size_group !== 'all' && (
                <span className="text-sm text-gray-600">
                  📏 {product.size_group === 'mini' ? 'Миниатюрные' :
                     product.size_group === 'small' ? 'Маленькие' :
                     product.size_group === 'medium' ? 'Средние' :
                     product.size_group === 'large' ? 'Крупные' :
                     product.size_group === 'giant' ? 'Гигантские' : product.size_group}
                </span>
              )}
            </div>
            
            {/* Рейтинг */}
            {(product.rating || product.rating_count !== undefined || product.reviews_count !== undefined) && (
              <div className="mt-3">
                <Rating
                  rating={product.rating || 0}
                  reviewsCount={product.rating_count || product.reviews_count}
                  readonly={true}
                  size="md"
                />
              </div>
            )}
          </div>
          
          {/* Выбор варианта (SKU) */}
          {product.skus && product.skus.length > 1 && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              {/* Группируем SKU по типам атрибутов */}
              {(() => {
                // Определяем, какие типы атрибутов есть у SKU
                const hasWeight = product.skus.some(s => s.weight_display || s.weight_kg)
                const hasFlavor = product.skus.some(s => s.flavor_display || s.flavor)
                const hasColor = product.skus.some(s => s.color_display || s.color)
                const hasSize = product.skus.some(s => s.size_code)
                const hasVolume = product.skus.some(s => s.volume_display || s.volume_ml)
                const hasPack = product.skus.some(s => s.pack_quantity)
                
                // Если только вес - показываем простой список
                const singleAttribute = [hasWeight, hasFlavor, hasColor, hasSize, hasVolume, hasPack].filter(Boolean).length <= 1
                
                if (singleAttribute) {
                  // Простой вариант - один тип атрибута
                  return (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        {hasWeight && 'Выберите вес:'}
                        {hasFlavor && 'Выберите вкус:'}
                        {hasColor && 'Выберите цвет:'}
                        {hasSize && 'Выберите размер:'}
                        {hasVolume && 'Выберите объём:'}
                        {hasPack && 'Выберите упаковку:'}
                        {!hasWeight && !hasFlavor && !hasColor && !hasSize && !hasVolume && !hasPack && 'Выберите вариант:'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {product.skus.map(sku => {
                          const isSelected = selectedSku?.id === sku.id || selectedSku?.sku === sku.sku
                          const label = sku.weight_display || sku.flavor_display || sku.color_display || 
                                       sku.size_code || sku.volume_display || 
                                       (sku.pack_quantity ? `${sku.pack_quantity} шт` : null) ||
                                       sku.name || 'Вариант'
                          
                          return (
                            <button
                              key={sku.id || sku.sku}
                              onClick={() => setSelectedSku(sku)}
                              disabled={!sku.available}
                              className={`px-4 py-2.5 rounded-lg border-2 transition-all flex flex-col items-center min-w-[80px] ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                                  : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                              } ${!sku.available ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {/* Цвет (если есть) */}
                              {sku.color_hex && (
                                <div 
                                  className="w-6 h-6 rounded-full border border-gray-300 mb-1"
                                  style={{ backgroundColor: sku.color_hex }}
                                />
                              )}
                              
                              <span className="text-sm font-medium text-gray-900">{label}</span>
                              <span className="text-xs font-semibold text-purple-600 mt-0.5">
                                {formatPrice(sku.price)}
                              </span>
                              
                              {!sku.available && (
                                <span className="text-[10px] text-red-500 mt-0.5">Нет в наличии</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                
                // Сложный вариант - несколько типов атрибутов
                // Группируем уникальные значения
                const weightOptions = [...new Set(product.skus.filter(s => s.weight_display).map(s => s.weight_display))]
                const flavorOptions = [...new Set(product.skus.filter(s => s.flavor_display).map(s => s.flavor_display))]
                const colorOptions = [...new Set(product.skus.filter(s => s.color_display).map(s => JSON.stringify({ display: s.color_display, hex: s.color_hex })))]
                const sizeOptions = [...new Set(product.skus.filter(s => s.size_code).map(s => s.size_code))]
                
                return (
                  <div className="space-y-4">
                    {/* Выбор веса */}
                    {weightOptions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Вес:</h3>
                        <div className="flex flex-wrap gap-2">
                          {weightOptions.map(weight => {
                            const matchingSku = product.skus.find(s => s.weight_display === weight)
                            const isSelected = selectedSku?.weight_display === weight
                            
                            return (
                              <button
                                key={weight}
                                onClick={() => {
                                  // Находим SKU с этим весом (и текущим вкусом/цветом если есть)
                                  const bestMatch = product.skus.find(s => 
                                    s.weight_display === weight &&
                                    (!selectedSku?.flavor_display || s.flavor_display === selectedSku.flavor_display) &&
                                    (!selectedSku?.color_display || s.color_display === selectedSku.color_display)
                                  ) || matchingSku
                                  setSelectedSku(bestMatch)
                                }}
                                disabled={!matchingSku?.available}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                } ${!matchingSku?.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <span className="text-sm font-medium">{weight}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Выбор вкуса */}
                    {flavorOptions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Вкус:</h3>
                        <div className="flex flex-wrap gap-2">
                          {flavorOptions.map(flavor => {
                            const matchingSku = product.skus.find(s => s.flavor_display === flavor)
                            const isSelected = selectedSku?.flavor_display === flavor
                            
                            return (
                              <button
                                key={flavor}
                                onClick={() => {
                                  const bestMatch = product.skus.find(s => 
                                    s.flavor_display === flavor &&
                                    (!selectedSku?.weight_display || s.weight_display === selectedSku.weight_display)
                                  ) || matchingSku
                                  setSelectedSku(bestMatch)
                                }}
                                disabled={!matchingSku?.available}
                                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                } ${!matchingSku?.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <span className="text-sm font-medium">{flavor}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Выбор цвета */}
                    {colorOptions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Цвет:</h3>
                        <div className="flex flex-wrap gap-2">
                          {colorOptions.map(colorJson => {
                            const color = JSON.parse(colorJson)
                            const matchingSku = product.skus.find(s => s.color_display === color.display)
                            const isSelected = selectedSku?.color_display === color.display
                            
                            return (
                              <button
                                key={colorJson}
                                onClick={() => {
                                  const bestMatch = product.skus.find(s => 
                                    s.color_display === color.display &&
                                    (!selectedSku?.size_code || s.size_code === selectedSku.size_code)
                                  ) || matchingSku
                                  setSelectedSku(bestMatch)
                                }}
                                disabled={!matchingSku?.available}
                                className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                } ${!matchingSku?.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                {color.hex && (
                                  <div 
                                    className="w-5 h-5 rounded-full border border-gray-300"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                )}
                                <span className="text-sm font-medium">{color.display}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Выбор размера */}
                    {sizeOptions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Размер:</h3>
                        <div className="flex flex-wrap gap-2">
                          {sizeOptions.map(size => {
                            const matchingSku = product.skus.find(s => s.size_code === size)
                            const isSelected = selectedSku?.size_code === size
                            
                            return (
                              <button
                                key={size}
                                onClick={() => {
                                  const bestMatch = product.skus.find(s => 
                                    s.size_code === size &&
                                    (!selectedSku?.color_display || s.color_display === selectedSku.color_display)
                                  ) || matchingSku
                                  setSelectedSku(bestMatch)
                                }}
                                disabled={!matchingSku?.available}
                                className={`px-4 py-2 rounded-lg border-2 transition-all min-w-[50px] text-center ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                } ${!matchingSku?.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <span className="text-sm font-bold">{size}</span>
                                {matchingSku?.size_back_cm && (
                                  <div className="text-[10px] text-gray-500">
                                    спина {matchingSku.size_back_cm} см
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Показываем цену выбранного SKU */}
                    {selectedSku && (
                      <div className="bg-purple-50 rounded-lg px-4 py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Выбрано: <span className="font-medium text-gray-900">
                            {[
                              selectedSku.weight_display,
                              selectedSku.flavor_display,
                              selectedSku.color_display,
                              selectedSku.size_code
                            ].filter(Boolean).join(' / ')}
                          </span>
                        </span>
                        <span className="text-lg font-bold text-purple-600">
                          {formatPrice(selectedSku.price)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
          
          {/* Цена и наличие */}
          <div className="border-t border-b border-gray-200 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                {(currentPrice.compare_price && currentPrice.compare_price > currentPrice.price) || product.discount_percent > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-gray-400 line-through">
                        {formatPrice(currentPrice.compare_price || product.price)}
                      </span>
                      {product.discount_percent > 0 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-sm rounded-lg font-bold">
                          -{product.discount_percent}%
                        </span>
                      )}
                    </div>
                    <span className="text-3xl font-bold text-red-600">
                      {formatPrice(currentPrice.price || product.discounted_price)}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(currentPrice.price)}
                  </span>
                )}
              </div>
              {currentPrice.available ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  В наличии
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                  Нет в наличии
                </span>
              )}
            </div>
            {currentPrice.stock > 0 && (
              <p className="text-sm text-gray-500">
                На складе: <span className={`font-medium ${currentPrice.stock <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                  {currentPrice.stock} шт.
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
          
          {/* Показания по здоровью */}
          {product.health_conditions && product.health_conditions.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Показания:</h3>
              <div className="flex flex-wrap gap-2">
                {product.health_conditions.map((condition, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {condition === 'urinary' ? 'Мочевыделительная система' :
                     condition === 'obesity' ? 'Контроль веса' :
                     condition === 'joint' ? 'Суставы' :
                     condition === 'skin' ? 'Кожа и шерсть' :
                     condition === 'digestive' ? 'Пищеварение' :
                     condition === 'kidney' ? 'Почки' :
                     condition === 'liver' ? 'Печень' :
                     condition === 'cardiac' ? 'Сердце' :
                     condition === 'dental' ? 'Зубы' :
                     condition === 'diabetes' ? 'Диабет' : condition}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Таблица нутриентов (для кормов) */}
          {product.category_details?.nutrition && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🥗</span>
                Пищевая ценность
              </h2>
              
              {/* Основные нутриенты */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {product.category_details.nutrition.protein_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">
                      {product.category_details.nutrition.protein_percent}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Белок</div>
                  </div>
                )}
                {product.category_details.nutrition.fat_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-orange-500">
                      {product.category_details.nutrition.fat_percent}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Жир</div>
                  </div>
                )}
                {product.category_details.nutrition.fiber_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">
                      {product.category_details.nutrition.fiber_percent}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Клетчатка</div>
                  </div>
                )}
                {product.category_details.nutrition.ash_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-gray-600">
                      {product.category_details.nutrition.ash_percent}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Зола</div>
                  </div>
                )}
                {product.category_details.nutrition.moisture_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-500">
                      {product.category_details.nutrition.moisture_percent}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Влажность</div>
                  </div>
                )}
                {product.category_details.nutrition.kcal_per_100g != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-red-500">
                      {Math.round(product.category_details.nutrition.kcal_per_100g)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ккал/100г</div>
                  </div>
                )}
              </div>
              
              {/* Минералы */}
              {(product.category_details.nutrition.calcium_percent != null || 
                product.category_details.nutrition.phosphorus_percent != null) && (
                <div className="border-t border-green-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Минералы</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {product.category_details.nutrition.calcium_percent != null && (
                      <div className="flex justify-between py-1.5 px-3 bg-white rounded-lg text-sm">
                        <span className="text-gray-600">Кальций</span>
                        <span className="font-medium">{product.category_details.nutrition.calcium_percent}%</span>
                      </div>
                    )}
                    {product.category_details.nutrition.phosphorus_percent != null && (
                      <div className="flex justify-between py-1.5 px-3 bg-white rounded-lg text-sm">
                        <span className="text-gray-600">Фосфор</span>
                        <span className="font-medium">{product.category_details.nutrition.phosphorus_percent}%</span>
                      </div>
                    )}
                    {product.category_details.nutrition.omega3_percent != null && (
                      <div className="flex justify-between py-1.5 px-3 bg-white rounded-lg text-sm">
                        <span className="text-gray-600">Омега-3</span>
                        <span className="font-medium">{product.category_details.nutrition.omega3_percent}%</span>
                      </div>
                    )}
                    {product.category_details.nutrition.omega6_percent != null && (
                      <div className="flex justify-between py-1.5 px-3 bg-white rounded-lg text-sm">
                        <span className="text-gray-600">Омега-6</span>
                        <span className="font-medium">{product.category_details.nutrition.omega6_percent}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Состав (если есть) */}
          {product.category_details?.ingredients && product.category_details.ingredients.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">📋</span>
                Состав
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.category_details.ingredients.slice(0, 12).map((ingredient, idx) => (
                  <span 
                    key={idx} 
                    className={`px-2.5 py-1 rounded-full text-sm ${
                      ingredient.percent 
                        ? 'bg-amber-200 text-amber-800 font-medium' 
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {ingredient.name || ingredient}
                    {ingredient.percent && <span className="ml-1 opacity-70">({ingredient.percent}%)</span>}
                  </span>
                ))}
                {product.category_details.ingredients.length > 12 && (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                    +{product.category_details.ingredients.length - 12} ещё
                  </span>
                )}
              </div>
              
              {/* Полный состав (если есть raw) */}
              {product.category_details.composition_raw && (
                <details className="mt-3">
                  <summary className="text-sm text-amber-700 cursor-pointer hover:text-amber-800">
                    Показать полный состав
                  </summary>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-line bg-white rounded-lg p-3">
                    {product.category_details.composition_raw}
                  </p>
                </details>
              )}
            </div>
          )}
          
          {/* Характеристики */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Характеристики</h2>
            <div className="space-y-2">
              {/* Страна производства */}
              {product.country && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Страна</span>
                  <span className="text-gray-900 font-medium">{product.country}</span>
                </div>
              )}
              {product.weight && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Вес</span>
                  <span className="text-gray-900 font-medium">{product.weight} кг</span>
                </div>
              )}
              {selectedSku?.weight_kg && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Вес упаковки</span>
                  <span className="text-gray-900 font-medium">{selectedSku.weight_display || `${selectedSku.weight_kg} кг`}</span>
                </div>
              )}
              {product.vendor_code && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Артикул</span>
                  <span className="text-gray-900 font-medium">{product.vendor_code}</span>
                </div>
              )}
              {selectedSku?.sku && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">SKU</span>
                  <span className="text-gray-900 font-medium">{selectedSku.sku}</span>
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
            {(currentPrice.available || product.is_available || product.in_stock || product.stock_count > 0) ? (
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
      <RecommendationBlock
        title="Часто покупают вместе"
        subtitle="Товары, которые другие покупатели выбирают вместе с этим"
        recommendations={recommendations}
        type="products"
        onAddToCart={async (product, qty = 1) => {
          if (!isAuthenticated) {
            navigate('/login')
            return
          }
          await addToCart(product.id, qty)
          await refreshCart()
          success(`${product.name} добавлен в корзину`)
        }}
        loading={isLoadingRecommendations}
        showReason={true}
        className="mt-12"
      />
    </div>
  )
}

export default ProductDetail

