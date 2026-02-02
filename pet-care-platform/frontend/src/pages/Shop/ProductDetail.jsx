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
  const { refreshCart, loadCart, getItemInCart, updateQuantity } = useCartStore()
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
  const [selectedSkuOptions, setSelectedSkuOptions] = useState({})
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

  // Гидрация корзины, чтобы корректно отобразить количество
  useEffect(() => {
    if (!isAuthenticated) return
    loadCart(false)
  }, [isAuthenticated, loadCart])
  
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
        setSelectedSkuOptions(getSkuSelection(defaultSku))
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

  const getSkuSelection = (sku) => {
    if (!sku) return {}
    const selection = {}
    const keys = [
      'weight_display',
      'flavor_display',
      'pack_quantity',
      'volume_display',
      'size_code',
      'color_display',
    ]
    keys.forEach((key) => {
      const value = sku[key]
      if (value !== null && value !== undefined && value !== '') {
        selection[key] = value
      }
    })
    return selection
  }

  const skuAttributes = useMemo(() => {
    if (!product?.skus?.length) return []
    const attributeDefinitions = [
      { key: 'weight_display', label: 'Вес', type: 'text' },
      { key: 'flavor_display', label: 'Вкус', type: 'text' },
      { key: 'pack_quantity', label: 'Упаковка', type: 'pack' },
      { key: 'volume_display', label: 'Объём', type: 'text' },
      { key: 'size_code', label: 'Размер', type: 'text' },
      { key: 'color_display', label: 'Цвет', type: 'color', colorKey: 'color_hex' },
    ]

    const presentAttributes = attributeDefinitions.filter(def =>
      product.skus.some(sku => {
        const value = sku[def.key]
        return value !== null && value !== undefined && value !== ''
      })
    )

    return presentAttributes.map(def => {
      const map = new Map()
      product.skus.forEach(sku => {
        const value = sku[def.key]
        if (value === null || value === undefined || value === '') return
        const id = String(value)
        if (!map.has(id)) {
          map.set(id, {
            value,
            label: def.type === 'pack' ? `${value} шт` : value,
            color: def.colorKey ? sku[def.colorKey] : null,
          })
        }
      })
      return { ...def, options: Array.from(map.values()) }
    })
  }, [product?.skus])

  const matchesSelection = (sku, selection) => {
    if (!selection) return true
    return Object.entries(selection).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true
      return sku[key] === value
    })
  }

  const handleSkuOptionSelect = (attributeKey, optionValue) => {
    const nextSelection = {
      ...selectedSkuOptions,
      [attributeKey]: optionValue,
    }

    const matching = product.skus.filter(sku => matchesSelection(sku, nextSelection))
    const matchingAvailable = matching.find(sku => sku.available)

    const fallback = product.skus.filter(sku => sku[attributeKey] === optionValue)
    const nextSku = matchingAvailable || matching[0] || fallback.find(sku => sku.available) || fallback[0]

    if (nextSku) {
      setSelectedSku(nextSku)
      setSelectedSkuOptions(getSkuSelection(nextSku))
    } else {
      setSelectedSkuOptions(nextSelection)
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

  const cartItem = product ? getItemInCart(product.id) : null
  const cartQuantity = cartItem?.quantity || 0
  const showQuantity = cartQuantity > 0

  const handleQuantityAdjust = async (delta) => {
    const nextQuantity = cartQuantity + delta
    if (nextQuantity < 0) return
    await updateQuantity(product.id, nextQuantity)
  }

  const animalType = product?.animal_type || product?.animal
  const categoryNameRaw = product?.category?.name || product?.category_name
  const categorySlugRaw = product?.category?.slug || product?.category_slug
  const subcategoryName = product?.subcategory?.name || product?.subcategory_name || product?.subcategory
  const subcategorySlug = product?.subcategory?.slug || product?.subcategory_slug || product?.subcategory
  
  const shouldFallbackToFood = Boolean(subcategoryName) && (!categoryNameRaw || categoryNameRaw === subcategoryName)
  const categoryName = shouldFallbackToFood ? 'Корм' : categoryNameRaw
  const categorySlug = shouldFallbackToFood ? 'food' : categorySlugRaw
  
  const buildShopLink = (params) => {
    const query = new URLSearchParams(params).toString()
    return query ? `/shop?${query}` : '/shop'
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
      {/* Навигация */}
      <div className="mb-6">
        <Link 
          to="/shop" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад в магазин
        </Link>
        <div className="mt-2 text-sm text-gray-500 flex flex-wrap items-center gap-2">
          {animalType === 'dog' && (
            <>
              <Link
                to={buildShopLink({ animal: 'dog' })}
                className="hover:text-primary-600"
              >
                Для собак
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          {animalType === 'cat' && (
            <>
              <Link
                to={buildShopLink({ animal: 'cat' })}
                className="hover:text-primary-600"
              >
                Для кошек
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          {categoryName && (
            <>
              <Link
                to={buildShopLink({
                  ...(animalType === 'dog' || animalType === 'cat' ? { animal: animalType } : {}),
                  ...(categorySlug ? { category_slug: categorySlug } : { category: categoryName })
                })}
                className="hover:text-primary-600"
              >
                {categoryName}
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          {subcategoryName && (
            <>
              <Link
                to={buildShopLink({
                  ...(animalType === 'dog' || animalType === 'cat' ? { animal: animalType } : {}),
                  ...(categorySlug ? { category_slug: categorySlug } : (categoryName ? { category: categoryName } : {})),
                  ...(subcategorySlug ? { subcategory: subcategorySlug } : {})
                })}
                className="hover:text-primary-600"
              >
                {subcategoryName}
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          <span className="text-gray-700 truncate max-w-[18rem]">{product.name}</span>
        </div>
      </div>
      
      {/* Герой товара */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
        {/* Галерея изображений */}
        <div className="space-y-4">
          {/* Главное изображение */}
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative">
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
                    className="w-full h-full object-contain p-6"
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
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
                                ? 'bg-primary-600 w-4' 
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
                    className={`aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 transition-all ${
                      idx === selectedImageIndex 
                        ? 'border-primary-500 ring-2 ring-primary-200' 
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
          {/* Основная информация */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                {product.animal_type === 'dog' || product.animal === 'dog' 
                  ? 'Для собак' 
                  : product.animal_type === 'cat' || product.animal === 'cat'
                    ? 'Для кошек'
                    : 'Для всех'}
              </span>
              {(product.category?.name || product.category_name) && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {product.category?.name || product.category_name}
                </span>
              )}
              {product.brand?.brand_class === 'super_premium' && (
                <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                  ★ Супер-премиум
                </span>
              )}
              {product.brand?.brand_class === 'premium' && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  ★ Премиум
                </span>
              )}
            </div>

            {(product.brand?.name || product.vendor) && (
              <p className="text-sm text-primary-700 font-semibold">
                {product.brand?.name || product.vendor}
              </p>
            )}

            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {(product.rating || product.rating_count !== undefined || product.reviews_count !== undefined) && (
              <div className="mt-3">
                <Rating
                  rating={product.rating || 0}
                  reviewsCount={product.rating_count || product.reviews_count}
                  readonly={true}
                  size="lg"
                />
              </div>
            )}
          </div>

          {/* Описание под названием */}
          {product.description && (
            <div className="text-gray-600 leading-relaxed">
              <p className="whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Ключевые преимущества */}
          {(product.is_veterinary || product.is_hypoallergenic || product.is_grain_free || product.age_group || product.size_group) && (
            <div className="flex flex-wrap gap-2">
              {product.is_veterinary && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                  ⚕️ Ветеринарная диета
                </span>
              )}
              {product.is_hypoallergenic && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  🛡️ Гипоаллергенный
                </span>
              )}
              {product.is_grain_free && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  🌾 Беззерновой
                </span>
              )}
              {product.age_group && product.age_group !== 'all' && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  🎂 {product.age_group === 'puppy' ? 'Для щенков' : 
                     product.age_group === 'kitten' ? 'Для котят' :
                     product.age_group === 'adult' ? 'Для взрослых' : 
                     product.age_group === 'senior' ? 'Для пожилых' : product.age_group}
                </span>
              )}
              {product.size_group && product.size_group !== 'all' && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  📏 {product.size_group === 'mini' ? 'Миниатюрные' :
                     product.size_group === 'small' ? 'Маленькие' :
                     product.size_group === 'medium' ? 'Средние' :
                     product.size_group === 'large' ? 'Крупные' :
                     product.size_group === 'giant' ? 'Гигантские' : product.size_group}
                </span>
              )}
            </div>
          )}
          
          {/* Выбор варианта (SKU) */}
          {product.skus && product.skus.length > 1 && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              {skuAttributes.map(attribute => (
                <div key={attribute.key}>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {attribute.label}:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {attribute.options.map(option => {
                      const isSelected = selectedSkuOptions[attribute.key] === option.value
                      const isOptionAvailable = product.skus.some(sku =>
                        sku.available && matchesSelection(sku, {
                          ...selectedSkuOptions,
                          [attribute.key]: option.value,
                        })
                      )
                      const isDisabled = !isOptionAvailable

                      return (
                        <button
                          key={`${attribute.key}-${option.value}`}
                          onClick={() => handleSkuOptionSelect(attribute.key, option.value)}
                          disabled={isDisabled}
                          className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300'
                          } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {attribute.type === 'color' && option.color && (
                            <span
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: option.color }}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {option.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {selectedSku && (
                <div className="bg-primary-50 rounded-lg px-4 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Выбрано: <span className="font-medium text-gray-900">
                      {skuAttributes
                        .map(attribute => selectedSku[attribute.key])
                        .filter(Boolean)
                        .join(' / ')}
                    </span>
                  </span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatPrice(selectedSku.price)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Цена + CTA */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  {(currentPrice.compare_price && currentPrice.compare_price > currentPrice.price) || product.discount_percent > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-base text-gray-400 line-through">
                          {formatPrice(currentPrice.compare_price || product.price)}
                        </span>
                        {product.discount_percent > 0 && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg font-bold">
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

              {(currentPrice.available || product.is_available || product.in_stock || product.stock_count > 0) ? (
                <div className="flex items-stretch gap-2 h-12">
                  <button
                    onClick={showQuantity ? () => navigate('/cart') : handleAddToCart}
                    disabled={isAddingToCart}
                    className="flex-1 min-w-0 btn-primary py-3 flex items-center justify-center gap-2 rounded-2xl transition-all duration-300"
                  >
                    {isAddingToCart ? (
                      <>
                        <ButtonLoader />
                        Добавление...
                      </>
                    ) : showQuantity ? (
                      <>
                        <span className="text-sm font-medium">В корзине</span>
                        <span className="text-[10px] opacity-80">Перейти</span>
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

                  <div
                    className={`
                      flex-shrink-0 flex items-center bg-gray-100 rounded-2xl overflow-hidden
                      transition-all duration-300
                      ${showQuantity ? 'w-[132px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-2 pointer-events-none'}
                    `.trim().replace(/\s+/g, ' ')}
                    aria-hidden={!showQuantity}
                  >
                    <button
                      onClick={() => handleQuantityAdjust(-1)}
                      className="w-10 h-full flex items-center justify-center text-primary-700 hover:bg-gray-200 transition-colors"
                      tabIndex={showQuantity ? 0 : -1}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 12a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 0 3h-13A1.5 1.5 0 0 1 4 12" />
                      </svg>
                    </button>
                    
                    <span className="text-sm font-semibold text-gray-800 w-8 text-center">
                      {cartQuantity}
                    </span>
                    
                    <button
                      onClick={() => handleQuantityAdjust(1)}
                      disabled={cartQuantity >= (product.stock_count || 999)}
                      className="w-10 h-full flex items-center justify-center text-primary-700 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      tabIndex={showQuantity ? 0 : -1}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4a1.5 1.5 0 0 1 1.5 1.5v5h5a1.5 1.5 0 0 1 0 3h-5v5a1.5 1.5 0 0 1-3 0v-5h-5a1.5 1.5 0 0 1 0-3h5v-5A1.5 1.5 0 0 1 12 4" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  disabled
                  className="w-full btn-secondary py-3 opacity-50 cursor-not-allowed rounded-2xl"
                >
                  Товар недоступен
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span>🚚</span>
                  Быстрая доставка
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span>↩️</span>
                  Удобный возврат
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Детали товара */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Состав (если есть) */}
          {product.category_details?.ingredients && product.category_details.ingredients.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
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

          {/* Таблица нутриентов (для кормов) */}
          {product.category_details?.nutrition && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🥗</span>
                Пищевая ценность
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {product.category_details.nutrition.protein_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-primary-600">
                      {product.category_details.nutrition.protein_percent}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Белок</div>
                  </div>
                )}
                {product.category_details.nutrition.fat_percent != null && (
                  <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-orange-700">
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
        </div>

        <div className="space-y-8">
          {/* Характеристики */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Характеристики</h2>
            <div className="space-y-2">
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

          {/* Показания по здоровью */}
          {product.health_conditions && product.health_conditions.length > 0 && (
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
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
        </div>
      </div>
      
      {/* Секция отзывов */}
      <div className="mt-10">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <ReviewsSection
            type="product"
            itemId={product.id}
            isPurchased={isPurchased}
          />
        </div>
      </div>

      {/* Рекомендации "Часто покупают вместе" */}
      <div className="mt-10">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
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
            className="mt-2"
          />
        </div>
      </div>
    </div>
  )
}

export default ProductDetail

