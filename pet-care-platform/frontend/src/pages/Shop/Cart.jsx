/**
 * Компонент страницы корзины
 * 
 * Корзина покупок с:
 * - Чекбоксами для выбора товаров/курсов
 * - Списком товаров в корзине
 * - Редактированием количества
 * - Удалением товаров
 * - Расчётом итого для выбранных
 * - Формой оформления заказа
 * - Оформлением заказа
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Alert } from '../../components/ui/Alert'
import RecommendationBlock from '../../components/RecommendationBlock'
import * as shopApi from '../../api/shop'
import { apiCache } from '../../utils/apiCache'
import { formatPrice } from '../../utils/format'

/**
 * Компонент страницы корзины
 * 
 * Отображает содержимое корзины с возможностью выборочного оформления.
 */
function Cart() {
  console.log('=== Cart component MOUNTED/RE-RENDERED ===')

  try {
    const navigate = useNavigate()
    const location = useLocation()
    const items = useCartStore(s => s.items)
    const total = useCartStore(s => s.total)
    const isLoading = useCartStore(s => s.isLoading)
    const error = useCartStore(s => s.error)
    const selectedItems = useCartStore(s => s.selectedItems)
    const {
      loadCart,
      updateQuantity,
      removeItem,
      clearError,
      setItemSelection,
      selectAllItems,
      deselectAllItems,
      selectAllProducts,
      deselectAllProducts,
      selectAllCourses,
      deselectAllCourses,
      getSelectedTotal,
      getSelectedItemIds,
      removeSelectedItems
    } = useCartStore()

    console.log('Cart state:', { itemsLength: items.length, total, isLoading, error, selectedItemsSize: selectedItems.size })

    const { success, error: showError } = useToastStore()

  // Сообщение из редиректа (например, при истечении времени checkout)
  const [redirectMessage, setRedirectMessage] = useState(null)
  const [isDeletingSelected, setIsDeletingSelected] = useState(false)
  
  // Рекомендации для корзины
  const [recommendations, setRecommendations] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const lastRecommendationsLoadRef = useRef(null)

  // Состояние для ошибок загрузки изображений
  const [imageErrors, setImageErrors] = useState(new Set())

  /**
   * Проверка, является ли элемент курсом
   */
  const isCourse = (item) => {
    return item.course !== undefined && item.course !== null
  }

  // Разделение товаров и курсов
  console.log('Filtering items by type')
  const products = items.filter(item => !isCourse(item))
  const courses = items.filter(item => isCourse(item))

  console.log('Products:', products.length, 'Courses:', courses.length)

  // Проверка "Выбрать все"
  const isAllSelected = items.length > 0 && selectedItems.size === items.length
  const selectedCount = selectedItems.size
  const selectedTotal = getSelectedTotal()

  console.log('Selection state:', { isAllSelected, selectedCount, selectedTotal })

  // Проверка выбора товаров и курсов
  const selectedProducts = products.filter(item => selectedItems.has(item.id))
  const selectedCourses = courses.filter(item => selectedItems.has(item.id))
  const isAllProductsSelected = products.length > 0 && selectedProducts.length === products.length
  const isAllCoursesSelected = courses.length > 0 && selectedCourses.length === courses.length

  /**
   * Загрузка рекомендаций для корзины
   */
  const loadRecommendations = useCallback(async () => {
    const currentProducts = items.filter(item => !isCourse(item))
    if (currentProducts.length === 0) {
      setRecommendations([])
      lastRecommendationsLoadRef.current = null
      return
    }

    // Проверяем, не загружали ли уже рекомендации для этого состояния корзины
    const currentStateKey = `${items.length}-${currentProducts.length}`
    if (lastRecommendationsLoadRef.current === currentStateKey && !recommendationsLoading) {
      return
    }

    lastRecommendationsLoadRef.current = currentStateKey
    setRecommendationsLoading(true)

    try {
      const response = await shopApi.getCartRecommendations(6)
      setRecommendations(response.recommendations || [])
    } catch (err) {
      console.error('Failed to load cart recommendations:', err)
      setRecommendations([])
    } finally {
      setRecommendationsLoading(false)
    }
  }, [items, recommendationsLoading])

  /**
   * Обработчик ошибки загрузки изображения
   */
  const handleImageError = (cartItemId) => {
    setImageErrors(prev => new Set(prev).add(cartItemId))
  }

  /**
   * Загрузка корзины при монтировании и обработка сообщений
   */
  useEffect(() => {
    loadCart()

    // Показываем сообщение из редиректа
    if (location.state?.message) {
      setRedirectMessage(location.state.message)
      // Очищаем state чтобы сообщение не показывалось повторно
      navigate(location.pathname, { replace: true, state: {} })
    }

    return () => clearError()
  }, [loadCart, location.state?.message, location.pathname, clearError, navigate])

  /**
   * Загрузка рекомендаций когда корзина загружена
   */
  useEffect(() => {
    if (!isLoading && items.length > 0) {
      loadRecommendations()
    }
  }, [isLoading, items.length])
  
  /**
   * Обработчик добавления рекомендованного товара в корзину
   */
  const handleAddRecommendation = async (product, quantity = 1) => {
    try {
      // Используем store метод, который автоматически обновит состояние
      const result = await useCartStore.getState().addItem(product.id, quantity)
      if (result) {
        success(`${product.name} добавлен в корзину`)
        // Перезагружаем рекомендации
        await loadRecommendations()
      } else {
        showError('Не удалось добавить товар в корзину')
      }
    } catch (err) {
      showError(err.message || 'Не удалось добавить товар в корзину')
    }
  }

  /**
   * Обработчик выбора/снятия элемента
   */
  const handleItemSelect = (itemId, checked) => {
    setItemSelection(itemId, checked)
  }

  /**
   * Обработчик "Выбрать все"
   */
  const handleSelectAll = (checked) => {
    if (checked) {
      selectAllItems()
    } else {
      deselectAllItems()
    }
  }

  /**
   * Обработчик "Выбрать все товары"
   */
  const handleSelectAllProducts = (checked) => {
    if (checked) {
      selectAllProducts()
    } else {
      deselectAllProducts()
    }
  }

  /**
   * Обработчик "Выбрать все курсы"
   */
  const handleSelectAllCourses = (checked) => {
    if (checked) {
      selectAllCourses()
    } else {
      deselectAllCourses()
    }
  }

  /**
   * Обработчик удаления выбранных элементов
   */
  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return

    setIsDeletingSelected(true)
    try {
      const result = await removeSelectedItems()
      if (result) {
        success(`Удалено ${selectedCount} элементов из корзины`)
      }
    } catch (err) {
      showError(err.message || 'Не удалось удалить выбранные элементы')
    } finally {
      setIsDeletingSelected(false)
    }
  }

  /**
   * Обработчик изменения количества
   */
  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 0) return
    await updateQuantity(productId, newQuantity)
  }

  /**
   * Обработчик удаления товара или курса
   */
  const handleRemove = async (itemId, isCourseItem, cartItemId) => {
    try {
      if (isCourseItem) {
        // Для курсов: бэкенд не поддерживает удаление через DELETE с course_id
        // Используем обходной путь - удаляем через прямой запрос к API
        // или просто перезагружаем корзину после попытки удаления

        // Пробуем удалить через DELETE с course_id (может не работать на бэкенде)
        try {
          // Используем store метод, который автоматически обновит состояние
          const result = await useCartStore.getState().removeCourse(itemId)
          if (result) {
            success('Курс удалён из корзины')
          } else {
            showError('Не удалось удалить курс из корзины')
          }
        } catch (err) {
          // Если бэкенд не поддерживает, показываем ошибку
          // В будущем нужно добавить поддержку удаления курсов на бэкенде
          console.error('Ошибка удаления курса:', err)
          showError('Не удалось удалить курс из корзины. Попробуйте обновить страницу.')
        }
      } else {
        // Для товаров используем стандартное удаление
        await removeItem(itemId)
        success('Товар удалён из корзины')
      }
    } catch (err) {
      showError(err.message || 'Не удалось удалить элемент из корзины')
    }
  }

  console.log('Checking render conditions:', { isLoading, itemsLength: items.length, error })

  // Состояние загрузки
  if (isLoading) {
    console.log('Rendering PageLoader')
    return <PageLoader />
  }

  // Состояние пустой корзины
  if (items.length === 0 && !isLoading) {
    console.log('Rendering empty cart')
    return (
      <div className="page-container animate-fadeIn">
        <div className="card max-w-lg mx-auto">
          {error && (
            <Alert variant="error" title="Ошибка загрузки корзины" className="mb-6">
              <p>{error}</p>
              <button
                onClick={() => {
                  clearError()
                  loadCart()
                }}
                className="mt-3 btn-primary text-sm"
              >
                Попробовать снова
              </button>
            </Alert>
          )}

          {!error && (
            <EmptyState
              icon="🛒"
              title="Корзина пуста"
              description="Добавьте товары из каталога, чтобы оформить заказ"
              action={
                <Link to="/shop" className="btn-primary">
                  Перейти в магазин
                </Link>
              }
            />
          )}
        </div>
      </div>
    )
  }

  console.log('Rendering cart content')

  return (
    <div className="page-container animate-fadeIn">
      <h1 className="page-title">Корзина</h1>

      {/* Сообщение из редиректа */}
      {redirectMessage && (
        <Alert variant="warning" dismissible onDismiss={() => setRedirectMessage(null)} className="mb-6">
          {redirectMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Товары в корзине */}
        <div className="lg:col-span-2 space-y-6">
          {/* Панель управления выбором */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-900">Выбрать все</span>
              {selectedCount > 0 && (
                <span className="text-sm text-gray-500">
                  (выбрано {selectedCount} из {items.length})
                </span>
              )}
            </label>

            <div className="flex gap-2">
              {selectedCount > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeletingSelected}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isDeletingSelected ? (
                    <>
                      <ButtonLoader />
                      Удаление...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Удалить выбранное ({selectedCount})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Блок товаров */}
          {products.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <h2 className="section-title mb-0 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Товары
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllProductsSelected}
                    onChange={(e) => handleSelectAllProducts(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Выбрать все товары
                  </span>
                  {selectedProducts.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({selectedProducts.length}/{products.length})
                    </span>
                  )}
                </label>
              </div>

              <div className="divide-y divide-gray-100">
                {products.map(item => {
              // Безопасная проверка структуры данных
              if (!item) return null

              const isCourseItem = isCourse(item)

              // Если это не курс и нет product, пропускаем
              if (!isCourseItem && !item.product) {
                console.error('Cart item missing product:', item)
                return null
              }

              // Используем ID элемента корзины как ключ - это стабильный уникальный идентификатор
              // который не меняется при обновлении количества
              const cartItemId = item.id // ID элемента корзины (стабильный ключ)
              const itemId = isCourseItem
                ? (item.course?.id || `course-${item.id}`)
                : (item.product?.id || item.id)
              const itemName = isCourseItem
                ? (item.course?.title || 'Курс')
                : (item.product?.name || 'Товар')
              const itemDescription = isCourseItem
                ? (item.course?.description || '')
                : (item.product?.description || '')
              const itemPrice = isCourseItem
                ? (item.course?.price || 0)
                : (item.product?.price || 0)
              const itemQuantity = item.quantity || 1
              // Исправление: используем animal вместо pet_type для товаров
              const itemPetType = isCourseItem
                ? (item.course?.pet_type || 'all')
                : (item.product?.animal || 'all')

                  return (
                    <div key={cartItemId} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex gap-4">
                        {/* Чекбокс выбора */}
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </label>

                        {/* Изображение товара */}
                        {(() => {
                          const mainImage = item.product?.main_image || (item.product?.images && item.product.images[0])
                          const hasImageError = imageErrors.has(cartItemId)

                          return (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {mainImage && !hasImageError ? (
                                <img
                                  src={mainImage}
                                  alt={itemName}
                                  className="w-full h-full object-contain p-1"
                                  loading="lazy"
                                  onError={() => handleImageError(cartItemId)}
                                />
                              ) : (
                                <span className="text-3xl opacity-50">
                                  {itemPetType === 'dog' ? '🐕' : itemPetType === 'cat' ? '🐱' : '🐾'}
                                </span>
                              )}
                            </div>
                          )
                        })()}

                        {/* Информация о товаре */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">
                              {itemName}
                            </h3>
                          </div>
                          
                          {/* Информация о вариации (SKU) */}
                          {item.sku && (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {item.sku.weight_display && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  ⚖️ {item.sku.weight_display}
                                </span>
                              )}
                              {item.sku.flavor_display && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-secondary-50 text-secondary-700 text-xs rounded-full">
                                  🍖 {item.sku.flavor_display}
                                </span>
                              )}
                              {item.sku.color_display && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full gap-1">
                                  {item.sku.color_hex && (
                                    <span 
                                      className="w-3 h-3 rounded-full border border-gray-300"
                                      style={{ backgroundColor: item.sku.color_hex }}
                                    />
                                  )}
                                  {item.sku.color_display}
                                </span>
                              )}
                              {item.sku.size_code && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                                  📏 {item.sku.size_code}
                                </span>
                              )}
                              {item.sku.volume_display && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs rounded-full">
                                  💧 {item.sku.volume_display}
                                </span>
                              )}
                              {item.sku.pack_quantity && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                                  📦 {item.sku.pack_quantity} шт
                                </span>
                              )}
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-500 line-clamp-1 leading-relaxed">
                            {itemDescription}
                          </p>
                          <p className="font-medium text-gray-900 mt-1">
                            {formatPrice(item.unit_price || item.sku?.price || itemPrice)}
                          </p>
                        </div>

                        {/* Управление количеством */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.product.id, itemQuantity - 1)}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">
                            {itemQuantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.product.id, itemQuantity + 1)}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            disabled={isLoading}
                          >
                            +
                          </button>
                        </div>

                        {/* Сумма и удаление */}
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatPrice((item.unit_price || item.sku?.price || itemPrice) * itemQuantity)}
                          </p>
                          <button
                            onClick={() => handleRemove(itemId, false, cartItemId)}
                            className="text-sm text-red-600 hover:text-red-700 mt-1 hover:underline transition-all"
                            disabled={isLoading}
                            title="Удалить товар из корзины"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Блок курсов */}
          {courses.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <h2 className="section-title mb-0 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Курсы
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllCoursesSelected}
                    onChange={(e) => handleSelectAllCourses(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Выбрать все курсы
                  </span>
                  {selectedCourses.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({selectedCourses.length}/{courses.length})
                    </span>
                  )}
                </label>
              </div>

              <div className="divide-y divide-gray-100">
                {courses.map(item => {
                  // Безопасная проверка структуры данных
                  if (!item) return null

                  const cartItemId = item.id
                  const itemId = item.course?.id || `course-${item.id}`
                  const itemName = item.course?.title || 'Курс'
                  const itemDescription = item.course?.description || ''
                  const itemPrice = item.course?.price || 0
                  const itemPetType = item.course?.pet_type || 'all'

                  return (
                    <div key={cartItemId} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex gap-4">
                        {/* Чекбокс выбора */}
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </label>

                        {/* Изображение курса */}
                        {(() => {
                          const courseImage = item.course?.image || item.course?.main_image
                          const hasImageError = imageErrors.has(cartItemId)

                          return (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {courseImage && !hasImageError ? (
                                <img
                                  src={courseImage}
                                  alt={itemName}
                                  className="w-full h-full object-contain p-1"
                                  loading="lazy"
                                  onError={() => handleImageError(cartItemId)}
                                />
                              ) : (
                                <span className="text-3xl opacity-50">
                                  📚
                                </span>
                              )}
                            </div>
                          )
                        })()}

                        {/* Информация о курсе */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">
                              {itemName}
                            </h3>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                              Курс
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                            {itemDescription}
                          </p>
                          {/* Информация о питомце для курса */}
                          {item.pet && (
                            <p className="text-xs text-primary-600 mt-1">
                              🐾 Для: {item.pet.name}
                            </p>
                          )}
                          <p className="font-medium text-gray-900 mt-1">
                            {formatPrice(itemPrice)}
                          </p>
                        </div>

                        {/* Сумма и удаление */}
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(itemPrice)}
                          </p>
                          <button
                            onClick={() => handleRemove(itemId, true, cartItemId)}
                            className="text-sm text-red-600 hover:text-red-700 mt-1 hover:underline transition-all"
                            disabled={isLoading}
                            title="Удалить курс из корзины"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Блок рекомендаций */}
          {(recommendations.length > 0 || recommendationsLoading) && (
            <RecommendationBlock
              title="Вам может понравиться"
              subtitle="Товары, которые часто покупают вместе с выбранными"
              recommendations={recommendations}
              type="mixed"
              onAddToCart={handleAddRecommendation}
              loading={recommendationsLoading}
              compact={true}
              showReason={true}
            />
          )}
        </div>

        {/* Итог и оформление заказа */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <h2 className="section-title">
              Оформление заказа
            </h2>

            {/* Итог заказа */}
            <div className="space-y-2 pb-4 border-b border-gray-100">
              <div className="flex justify-between text-gray-600">
                <span>Всего в корзине:</span>
                <span>{items.length} шт.</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Выбрано:</span>
                <span className="font-medium text-primary-600">{selectedCount} шт.</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>К оплате:</span>
                <span className={selectedCount > 0 ? 'text-primary-600' : 'text-gray-400'}>
                  {formatPrice(selectedTotal)}
                </span>
              </div>
            </div>

            {/* Кнопка оформления заказа */}
            <div className="pt-4">
              <Link
                to="/checkout"
                state={{ selectedItems: getSelectedItemIds() }}
                className={`block w-full btn-primary py-3 text-center ${
                  selectedCount === 0 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                {selectedCount > 0
                  ? `Оформить заказ (${selectedCount})`
                  : 'Выберите товары'
                }
              </Link>
            </div>

            {selectedCount === 0 && (
              <p className="text-xs text-secondary-600 mt-3 text-center">
                Выберите товары или курсы для оформления
              </p>
            )}

            <p className="text-xs text-gray-500 mt-4 text-center">
              {selectedCount > 0
                ? 'Только выбранные товары будут оформлены'
                : 'Товары и курсы будут оформлены в одном заказе'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    console.error('Error in Cart component:', error)
    return (
      <div className="page-container animate-fadeIn">
        <div className="card max-w-lg mx-auto">
          <EmptyState
            icon="⚠️"
            title="Ошибка загрузки корзины"
            description="Произошла ошибка при отображении корзины. Попробуйте обновить страницу."
            action={
              <button onClick={() => window.location.reload()} className="btn-primary">
                Обновить страницу
              </button>
            }
          >
            <details className="mt-4 text-left w-full">
              <summary className="cursor-pointer text-sm text-gray-500">Подробности ошибки</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          </EmptyState>
        </div>
      </div>
    )
  }
}

export default Cart
