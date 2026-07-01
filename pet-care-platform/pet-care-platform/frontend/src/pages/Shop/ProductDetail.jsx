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

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { getProduct, getProductV2, addToCart, getFrequentlyBoughtTogether, getProductBreedRecommendations } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
import { useCartStore, setPendingCartAdd } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import Rating from '../../components/Rating'
import ReviewsSection from '../../components/ReviewsSection'
import RecommendationBlock from '../../components/RecommendationBlock'
import FavoriteButton from '../../components/FavoriteButton'
import { formatPrice, cleanProductName } from '../../utils/format'

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
 * SVG-заглушка для отсутствующих изображений
 */
const getPlaceholderImage = (label = 'Нет фото') => {
  const safeLabel = String(label || 'Нет фото').slice(0, 30)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f3f4f6"/><rect x="120" y="160" width="360" height="280" rx="24" fill="#e5e7eb"/><text x="300" y="325" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">${safeLabel}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Компонент страницы ProductDetail
 */
function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { refreshCart, loadCart, getItemInCart, updateQuantity, replayPendingCartAdd } = useCartStore()
  const { success, error: showError, info } = useToastStore()
  
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [activeDetailsTab, setActiveDetailsTab] = useState('characteristics')
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false)
  const descriptionRef = useRef(null)

  const reviewsCount = useMemo(() => {
    if (!product) return 0
    return (product.reviews_count ?? product.rating_count ?? 0)
  }, [product])

  // Название товара с исправленными опечатками (P2.13) — на уровне отображения
  const displayName = useMemo(() => cleanProductName(product?.name), [product])

  const detailsTabs = useMemo(() => {
    const tabs = []
    if (product?.food_details?.ingredients && product.food_details.ingredients.length > 0) {
      tabs.push({ key: 'composition', label: 'Состав' })
    }
    tabs.push({ key: 'characteristics', label: 'Характеристики' })
    return tabs
  }, [product?.food_details?.ingredients])

  useEffect(() => {
    if (!detailsTabs.length) return
    if (!detailsTabs.find(tab => tab.key === activeDetailsTab)) {
      setActiveDetailsTab(detailsTabs[0].key)
    }
  }, [detailsTabs, activeDetailsTab])

  useEffect(() => {
    if (!descriptionRef.current) return
    if (isDescriptionExpanded) {
      setIsDescriptionTruncated(false)
      return
    }
    const el = descriptionRef.current
    const isOverflowing = el.scrollHeight > el.clientHeight + 1
    setIsDescriptionTruncated(isOverflowing)
  }, [product?.description, isDescriptionExpanded])

  const characteristics = useMemo(() => {
    if (!product) return []
    const animalLabels = {
      dog: 'Собак',
      cat: 'Кошек',
      all: 'Все',
    }
    const ageLabels = {
      puppy: 'Для щенков',
      kitten: 'Для котят',
      adult: 'Для взрослых',
      senior: 'Для пожилых',
    }
    const sizeLabels = {
      mini: 'Миниатюрные',
      small: 'Маленькие',
      medium: 'Средние',
      large: 'Крупные',
      giant: 'Гигантские',
    }
    const groupLabels = {
      food: 'Корма',
      treats: 'Лакомства',
      vet: 'Ветаптека',
      vitamins: 'Витамины',
      clothes: 'Одежда',
      equipment: 'Амуниция',
      grooming: 'Груминг',
      housing: 'Содержание',
      toys: 'Игрушки',
      bowls: 'Миски',
      toilet: 'Туалеты',
      other: 'Прочее',
    }

    const list = []
    if (product.brand?.name) list.push({ label: 'Бренд', value: product.brand.name })
    if (product.category?.name) list.push({ label: 'Категория', value: product.category.name })
    if (product.animal_type) list.push({ label: 'Тип питомца', value: animalLabels[product.animal_type] || product.animal_type })
    if (product.product_group) list.push({ label: 'Группа товаров', value: groupLabels[product.product_group] || product.product_group })
    if (product.age_group && product.age_group !== 'all') list.push({ label: 'Возраст', value: ageLabels[product.age_group] || product.age_group })
    if (product.size_group && product.size_group !== 'all') list.push({ label: 'Размер', value: sizeLabels[product.size_group] || product.size_group })
    if (product.country) list.push({ label: 'Страна', value: product.country })
    if (selectedSku?.weight_kg) list.push({ label: 'Вес упаковки', value: selectedSku.weight_display || `${selectedSku.weight_kg} кг` })
    if (product.sku_count && product.sku_count > 1) list.push({ label: 'Варианты', value: product.sku_count })
    return list
  }, [product, selectedSku])

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const raw = params.get('return_to')
    if (!raw) return null
    return raw.startsWith('/') ? raw : null
  }, [location.search])
  
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
      available: product?.is_available,
      stock: null
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
    // P1.6: гость нажал «В корзину» до входа — добавляем сохранённый товар после логина
    replayPendingCartAdd().then((added) => {
      if (added) {
        refreshCart()
        success('Товар добавлен в корзину.', 4000)
      }
    })
  }, [isAuthenticated, loadCart, replayPendingCartAdd, refreshCart, success])
  
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
      const response = await getFrequentlyBoughtTogether(id, 8)
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
      // P1.6: сохраняем товар и возвращаем пользователя на эту же страницу товара
      setPendingCartAdd(product.id, quantity)
      const redirectPath = `${location.pathname}${location.search}` || `/shop/products/${product.id}`
      info('Войдите или зарегистрируйтесь — мы сохраним товар и добавим его в корзину.', 5000)
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`)
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

  const animalType = product?.animal_type
  const categoryName = product?.category?.name
  const categorySlug = product?.category?.slug
  
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
          <p className="text-red-600 mb-4">{error || 'Товар не найден'}</p>
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
        {returnTo && (
          <button
            onClick={() => navigate(returnTo)}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Вернуться к рациону
          </button>
        )}
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
                Собак
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
                Кошек
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          {categoryName && (
            <>
              <Link
                to={buildShopLink({
                  ...(animalType === 'dog' || animalType === 'cat' ? { animal: animalType } : {}),
                  ...(categorySlug ? { category_slug: categorySlug } : {})
                })}
                className="hover:text-primary-600"
              >
                {categoryName}
              </Link>
              <span className="text-gray-300">/</span>
            </>
          )}
          <span className="text-gray-700 truncate max-w-[18rem]">{displayName}</span>
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
                imageUrls.push(getPlaceholderImage())
              }
              
              const currentImage = imageUrls[selectedImageIndex] || imageUrls[0]
              
              return (
                <>
                  <img 
                    src={currentImage} 
                    alt={displayName ? `${displayName} - изображение товара` : 'Изображение товара'}
                    className="w-full h-full object-contain p-6"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = ''
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-8xl opacity-40">📦</span></div>'
                    }}
                  />
                  
                  {/* Кнопка «В избранное» на фото товара */}
                  <div className="absolute top-3 right-3 z-10">
                    <FavoriteButton
                      itemId={product.id}
                      type="product"
                      size="md"
                      showBackground={true}
                      className="shadow-lg"
                    />
                  </div>
                  
                  {/* Стрелки навигации */}
                  {imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : imageUrls.length - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                        aria-label="Предыдущее изображение"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedImageIndex(prev => prev < imageUrls.length - 1 ? prev + 1 : 0)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all"
                        aria-label="Следующее изображение"
                      >
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
        </div>
        
        {/* Информация о товаре */}
        <div className="space-y-6">
          {/* Основная информация */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                {product.animal_type === 'dog'
                  ? 'Собак'
                  : product.animal_type === 'cat'
                    ? 'Кошек'
                    : 'Все'}
              </span>
              {product.category?.name && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {product.category?.name}
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

            {product.brand?.name && (
              <p className="text-sm text-primary-700 font-semibold">
                {product.brand?.name}
              </p>
            )}

            <h1 className="page-title mb-0 leading-tight">
              {displayName}
            </h1>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  const section = document.getElementById('reviews')
                  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="text-left"
              >
                {reviewsCount > 0 ? (
                  <div className="flex items-center gap-3">
                    <Rating
                      rating={product.rating || 0}
                      reviewsCount={reviewsCount}
                      readonly={true}
                      size="lg"
                    />
                    <span className="text-sm text-primary-600 hover:text-primary-700">
                      Отзывы ({reviewsCount})
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 hover:text-primary-700">
                    Пока нет отзывов — оставьте первый
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Описание под названием */}
          {product.description && (
            <div className="text-gray-600 leading-relaxed">
              <div
                ref={descriptionRef}
                className={`relative ${
                  isDescriptionExpanded ? '' : 'max-h-28 overflow-hidden'
                }`}
              >
                <p className="whitespace-pre-line">
                  {product.description}
                </p>
                {!isDescriptionExpanded && isDescriptionTruncated && (
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                )}
              </div>
              {isDescriptionTruncated && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(prev => !prev)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  {isDescriptionExpanded ? 'Свернуть' : 'Прочитать полностью'}
                </button>
              )}
            </div>
          )}

          {/* Вариации товара */}
          {product.skus && product.skus.length > 1 && skuAttributes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Вариации товара</h3>
              <div className="space-y-4">
                {skuAttributes.map(attribute => (
                  <div key={attribute.key}>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">
                      {attribute.label}:
                    </h4>
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
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-primary-300 text-gray-700'
                            } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {attribute.type === 'color' && option.color && (
                              <span
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: option.color }}
                              />
                            )}
                            <span>{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {selectedSku && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      Выбрано: <span className="font-medium text-gray-900">
                        {skuAttributes
                          .map(attribute => selectedSku[attribute.key])
                          .filter(Boolean)
                          .join(' / ')}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-primary-600">
                      {formatPrice(selectedSku.price)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ключевые преимущества */}
          {(product.is_veterinary || product.is_hypoallergenic || product.is_grain_free || product.age_group || product.size_group) && (
            <div className="flex flex-wrap gap-2">
              {product.is_veterinary && (
                <span className="px-3 py-1 bg-accent-100 text-accent-700 text-xs font-medium rounded-full">
                  ⚕️ Ветеринарная диета
                </span>
              )}
              {product.is_hypoallergenic && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  🛡️ Гипоаллергенный
                </span>
              )}
              {product.is_grain_free && (
                <span className="px-3 py-1 bg-secondary-100 text-secondary-700 text-xs font-medium rounded-full">
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
                  На складе: <span className={`font-medium ${currentPrice.stock <= 5 ? 'text-accent-600' : 'text-green-600'}`}>
                    {currentPrice.stock} шт.
                  </span>
                </p>
              )}

              {(currentPrice.available || product.is_available) ? (
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
                      disabled={currentPrice.stock ? cartQuantity >= currentPrice.stock : false}
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

            </div>
          </div>
        </div>
      </div>

      {/* Два окна: слева — состав/характеристики, справа — отзывы */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левое окно: состав и характеристики */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {detailsTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDetailsTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeDetailsTab === tab.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDetailsTab === 'composition' && (
            <div className="flex flex-wrap gap-2">
              {product.food_details?.ingredients?.slice(0, 24).map((ingredient, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-sm bg-secondary-100 text-secondary-700"
                >
                  {ingredient}
                </span>
              ))}
            </div>
          )}

          {activeDetailsTab === 'characteristics' && (
            <div className="space-y-2">
              {characteristics.map((item, index) => (
                <div key={item.label} className={`flex justify-between py-2 ${index < characteristics.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-gray-600">{item.label}</span>
                  <span className="text-gray-900 font-medium">{item.value}</span>
                </div>
              ))}
              {product.health_conditions && product.health_conditions.length > 0 && (
                <div className="pt-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Показания</div>
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
          )}
        </div>

        {/* Правое окно: отзывы */}
        <div id="reviews" className="bg-white rounded-2xl border border-gray-100 p-5">
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
            onAddToCart={async (recProduct, qty = 1) => {
              if (!isAuthenticated) {
                // P1.6: сохраняем выбранный товар и возвращаем сюда после входа
                setPendingCartAdd(recProduct.id, qty)
                const redirectPath = `${location.pathname}${location.search}` || `/shop/products/${recProduct.id}`
                info('Войдите или зарегистрируйтесь — мы сохраним товар и добавим его в корзину.', 5000)
                navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`)
                return
              }
              await addToCart(recProduct.id, qty)
              await refreshCart()
              success(`${cleanProductName(recProduct.name)} добавлен в корзину`)
            }}
            loading={isLoadingRecommendations}
            showReason={true}
            className="mt-2"
            compact={true}
            maxItems={8}
            gridCols="grid-cols-2 sm:grid-cols-4"
          />
        </div>
      </div>
    </div>
  )
}

export default ProductDetail

