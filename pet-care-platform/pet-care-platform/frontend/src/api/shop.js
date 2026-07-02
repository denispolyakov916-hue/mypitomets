/**
 * Модуль API магазина
 * 
 * Предоставляет функции для работы с магазином:
 * - Каталог товаров с фильтрацией
 * - Управление корзиной
 * - Оформление заказов
 * 
 * Каталог товаров публичный, корзина и заказы требуют аутентификации.
 */

import api from './client'
import { createCrudApi, createReadOnlyApi } from './baseApi'

// Создаем CRUD API клиенты для разных сущностей
const productsApi = createReadOnlyApi('/shop/products/')  // Товары - только чтение для обычных пользователей
const productsApiV2 = createReadOnlyApi('/shop/v2/products/')  // Товары v2 - новая структура
const cartApi = createCrudApi('/shop/cart/')             // Корзина - CRUD
const ordersApi = createCrudApi('/shop/orders/')         // Заказы - CRUD
const addressesApi = createCrudApi('/shop/addresses/')   // Адреса - CRUD

// =============================================================================
// ТОВАРЫ (Legacy API)
// =============================================================================

/**
 * Получение каталога товаров с расширенной фильтрацией
 * 
 * Возвращает товары с опциональной фильтрацией и пагинацией.
 * Публичный эндпоинт - аутентификация не требуется.
 * 
 * @param {Object} [filters] - Опциональные фильтры
 * @param {string} [filters.animal] - Фильтр по животному ('dog', 'cat')
 * @param {string} [filters.category] - Категория ('food', 'pharmacy', 'ammunition', 'care', 'transport', 'toys')
 * @param {string} [filters.subcategory] - Подкатегория
 * @param {string} [filters.vendor] - Бренд
 * @param {string} [filters.min_price] - Минимальная цена
 * @param {string} [filters.max_price] - Максимальная цена
 * @param {string} [filters.in_stock] - Только в наличии ('true')
 * @param {string} [filters.search] - Поиск по названию
 * @param {string} [filters.page] - Номер страницы
 * @returns {Promise<Object>} Товары, пагинация и доступные фильтры
 * 
 * @example
 *   const { products, pagination, filters } = await getProducts({ animal: 'dog', category: 'food' })
 */
export const getProducts = async (filters = {}) => {
  return await productsApi.getList(filters)
}

/**
 * Получение деталей одного товара
 *
 * @param {number} productId - Уникальный идентификатор товара
 * @returns {Promise<Object>} Данные товара
 */
export const getProduct = async (productId) => {
  return await productsApi.getById(productId)
}

// =============================================================================
// ТОВАРЫ V2 (Новая структура по database_tz.md)
// =============================================================================

/**
 * Получение каталога товаров V2 с расширенной фильтрацией
 * 
 * Новая структура с поддержкой:
 * - Иерархических категорий
 * - Брендов
 * - Возрастных и размерных групп
 * - Boolean-фильтров (беззерновой, гипоаллергенный, ветеринарный)
 * 
 * @param {Object} [filters] - Опциональные фильтры
 * @param {string} [filters.animal_type] - Тип животного ('dog', 'cat', 'all')
 * @param {string} [filters.category_id] - ID категории
 * @param {string} [filters.category_slug] - Slug категории
 * @param {string} [filters.product_group] - Группа товаров ('food', 'treats', 'vet', etc.)
 * @param {string} [filters.brand_id] - ID бренда
 * @param {string} [filters.brand_slug] - Slug бренда
 * @param {string} [filters.age_group] - Возрастная группа ('puppy', 'adult', 'senior')
 * @param {string} [filters.size_group] - Размерная группа ('mini', 'small', 'medium', 'large', 'giant')
 * @param {string} [filters.is_grain_free] - Беззерновой ('true')
 * @param {string} [filters.is_hypoallergenic] - Гипоаллергенный ('true')
 * @param {string} [filters.is_veterinary] - Ветеринарная диета ('true')
 * @param {string} [filters.health_condition] - Показание по здоровью
 * @param {string} [filters.min_price] - Минимальная цена
 * @param {string} [filters.max_price] - Максимальная цена
 * @param {string} [filters.search] - Поиск
 * @param {string} [filters.sort] - Сортировка ('price_asc', 'price_desc', 'rating', 'newest')
 * @param {number} [filters.page] - Номер страницы
 * @returns {Promise<Object>} Товары, пагинация и фильтры
 */
export const getProductsV2 = async (filters = {}) => {
  return await productsApiV2.getList(filters)
}

/**
 * Получение деталей товара V2 (с SKU и полной информацией)
 *
 * @param {number} productId - ID товара
 * @returns {Promise<Object>} Полные данные товара включая SKU
 */
export const getProductV2 = async (productId) => {
  return await productsApiV2.getById(productId)
}

/**
 * Получение товара по slug
 *
 * @param {string} slug - Slug товара
 * @returns {Promise<Object>} Полные данные товара
 */
export const getProductBySlug = async (slug) => {
  return await api.get(`/shop/v2/products/by-slug/${slug}/`)
}

/**
 * Получение списка категорий
 *
 * @param {Object} [params] - Параметры
 * @param {string} [params.animal_type] - Фильтр по типу животного
 * @param {boolean} [params.tree] - Вернуть в виде дерева
 * @returns {Promise<Object>} Список категорий
 */
export const getCategories = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.animal_type) queryParams.append('animal_type', params.animal_type)
  if (params.tree) queryParams.append('tree', 'true')
  
  const queryString = queryParams.toString()
  return await api.get(`/shop/categories/${queryString ? '?' + queryString : ''}`)
}

/**
 * Получение деталей категории
 *
 * @param {string} slug - Slug категории
 * @returns {Promise<Object>} Данные категории с подкатегориями
 */
export const getCategory = async (slug) => {
  return await api.get(`/shop/categories/${slug}/`)
}

/**
 * Получение списка брендов
 *
 * @param {Object} [params] - Параметры
 * @param {number} [params.limit] - Лимит
 * @returns {Promise<Object>} Список брендов
 */
export const getBrands = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.limit) queryParams.append('limit', params.limit)
  
  const queryString = queryParams.toString()
  return await api.get(`/shop/brands/${queryString ? '?' + queryString : ''}`)
}

/**
 * Получение деталей бренда
 *
 * @param {string} slug - Slug бренда
 * @returns {Promise<Object>} Данные бренда
 */
export const getBrand = async (slug) => {
  return await api.get(`/shop/brands/${slug}/`)
}

/**
 * Получение товаров для породы
 *
 * @param {number} breedId - ID породы
 * @param {Object} [params] - Параметры
 * @param {string} [params.product_group] - Группа товаров
 * @param {number} [params.limit] - Лимит
 * @returns {Promise<Object>} Товары, подходящие для породы
 */
export const getProductsForBreed = async (breedId, params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.product_group) queryParams.append('product_group', params.product_group)
  if (params.limit) queryParams.append('limit', params.limit)
  
  const queryString = queryParams.toString()
  return await api.get(`/shop/breeds/${breedId}/products/${queryString ? '?' + queryString : ''}`)
}

/**
 * Получение рекомендаций товара для пород
 *
 * @param {number} productId - ID товара
 * @returns {Promise<Object>} Рекомендации для пород
 */
export const getProductBreedRecommendations = async (productId) => {
  return await api.get(`/shop/products/${productId}/breed-recommendations/`)
}

/**
 * Получение рекомендаций "Часто покупают вместе"
 *
 * @param {number} productId - Уникальный идентификатор товара
 * @returns {Promise<Object>} Рекомендации товаров
 */
export const getFrequentlyBoughtTogether = async (productId, limit = 8) => {
  return await api.get(`/shop/products/${productId}/frequently-bought/?limit=${limit}`)
}

/**
 * Получение персональных рекомендаций товаров и курсов
 *
 * @param {Object} [options] - Опции
 * @param {number} [options.products_limit=8] - Лимит товаров
 * @param {number} [options.courses_limit=4] - Лимит курсов
 * @param {string} [options.type='all'] - Тип рекомендаций ('all', 'products', 'courses')
 * @returns {Promise<Object>} Персональные рекомендации на основе питомцев пользователя
 */
export const getPersonalRecommendations = async (options = {}) => {
  const params = new URLSearchParams()
  
  if (options.products_limit) params.append('products_limit', options.products_limit)
  if (options.courses_limit) params.append('courses_limit', options.courses_limit)
  if (options.type) params.append('type', options.type)
  
  const queryString = params.toString()
  const url = queryString ? `/shop/personal-recommendations/?${queryString}` : '/shop/personal-recommendations/'
  
  return await api.get(url)
}

/**
 * Получение рекомендаций для корзины
 *
 * @param {number} [limit=6] - Максимальное количество рекомендаций
 * @returns {Promise<Object>} Рекомендации товаров для корзины
 */
export const getCartRecommendations = async (limit = 6) => {
  return await api.get(`/shop/cart/recommendations/?limit=${limit}`)
}

/**
 * Получение товаров, отфильтрованных по проблемам здоровья
 *
 * @param {string} healthIssue - Код проблемы здоровья
 * @param {number} [limit=12] - Максимальное количество товаров
 * @returns {Promise<Object>} Товары для конкретной проблемы здоровья
 */
export const getHealthFilteredProducts = async (healthIssue, limit = 12) => {
  const params = new URLSearchParams()
  if (healthIssue) params.append('health_issue', healthIssue)
  params.append('limit', limit)
  
  return await api.get(`/shop/products/health-filter/?${params.toString()}`)
}

/**
 * Получение списка доступных фильтров по проблемам здоровья
 *
 * @returns {Promise<Object>} Список доступных фильтров
 */
export const getHealthFilters = async () => {
  return await api.get('/shop/products/health-filter/')
}

// =============================================================================
// ВИШЛИСТ (ПОДАРОЧНЫЙ СПИСОК ДЛЯ ШАРИНГА)
// =============================================================================

/**
 * Бэкенд-сериализатор вишлиста отдаёт числовые поля товара (цена, рейтинг)
 * строками — DecimalField. ProductCard ждёт number, поэтому приводим их к
 * Number, чтобы карточка не спотыкалась на строках и не сыпала warning'ами.
 */
const WISHLIST_NUMERIC_FIELDS = ['price', 'compare_price', 'old_price', 'discount_price', 'rating', 'rating_count', 'reviews_count', 'stock_count']
const normalizeWishlist = (wishlist) => {
  if (!wishlist || !Array.isArray(wishlist.items)) return wishlist
  return {
    ...wishlist,
    items: wishlist.items.map((item) => {
      if (!item || !item.product) return item
      const product = { ...item.product }
      for (const f of WISHLIST_NUMERIC_FIELDS) {
        if (product[f] != null && product[f] !== '') product[f] = Number(product[f])
      }
      return { ...item, product }
    }),
  }
}

/**
 * Получить свой вишлист (создаётся при первом запросе).
 * @returns {Promise<Object>} { id, name, share_token, share_url, items, ... }
 */
export const getMyWishlist = async () => {
  // axios-обёртка уже разворачивает .data (см. client.js interceptor), а GET
  // возвращает сам объект вишлиста — деструктуризация { data } давала undefined.
  return normalizeWishlist(await api.get('/shop/wishlist/'))
}

/**
 * Добавить товар в вишлист.
 * @param {number} productId - ID товара
 * @returns {Promise<Object>} { message, data } — обновлённый вишлист
 */
export const addToWishlist = async (productId) => {
  const { data } = await api.post('/shop/wishlist/', { product_id: productId })
  return normalizeWishlist(data)
}

/**
 * Удалить товар из вишлиста.
 * @param {number} productId - ID товара
 * @returns {Promise<Object>} { message, data } — обновлённый вишлист
 */
export const removeFromWishlist = async (productId) => {
  const { data } = await api.delete(`/shop/wishlist/?product_id=${productId}`)
  return normalizeWishlist(data)
}

/**
 * Получить вишлист по токену (публичная ссылка для тех, кому скинули).
 * @param {string} token - Токен из ссылки
 * @returns {Promise<Object>} { id, name, owner_name, items }
 */
export const getSharedWishlist = async (token) => {
  return normalizeWishlist(await api.get(`/shop/wishlist/shared/${token}/`))
}

// =============================================================================
// КОРЗИНА
// =============================================================================

/**
 * Получение корзины текущего пользователя
 * 
 * Возвращает элементы корзины с полными данными товаров и итогами.
 * Требует аутентификации.
 * 
 * @returns {Promise<Object>} Элементы корзины, общая сумма, количество позиций
 */
export const getCart = async () => {
  return await cartApi.getList()
}

/**
 * Добавление товара в корзину
 * 
 * Если товар уже в корзине (с тем же SKU), количество увеличивается.
 * 
 * @param {number} productId - Товар для добавления
 * @param {number} [quantity=1] - Количество для добавления
 * @param {number} [skuId] - ID вариации товара (SKU) - опционально
 * @returns {Promise<Object>} Обновлённые данные корзины
 * 
 * @example
 *   await addToCart(5, 2)           // Добавить 2 единицы товара #5 (default SKU)
 *   await addToCart(5, 1, 123)      // Добавить 1 единицу товара #5, вариация #123
 */
export const addToCart = async (productId, quantity = 1, skuId = null) => {
  const body = {
    product_id: productId,
    quantity
  }
  
  if (skuId) {
    body.sku_id = skuId
  }
  
  return await api.post('/shop/cart/', body)
}

/**
 * Добавление курса в корзину
 * 
 * Добавляет курс в корзину с опциональной привязкой к питомцу.
 * 
 * @param {number} courseId - Курс для добавления
 * @param {string} [petId] - ID питомца для привязки курса (опционально)
 * @param {boolean} [disclaimerAccepted=false] - Согласие с условиями использования
 * @returns {Promise<Object>} Обновлённые данные корзины
 * 
 * @example
 *   await addCourseToCart(5, 'pet-uuid', true)  // Добавить курс #5 для питомца с согласием
 */
export const addCourseToCart = async (courseId, petId = null, disclaimerAccepted = false) => {
  const body = {
    course_id: courseId,
    disclaimer_accepted: disclaimerAccepted
  }
  
  if (petId) {
    body.pet_id = petId
  }
  
  return await api.post('/shop/cart/', body)
}

/**
 * Обновление количества товара в корзине
 * 
 * При quantity=0 товар удаляется.
 * 
 * @param {number} cartItemId - ID строки корзины (CartItem.id) — однозначный ключ,
 *   корректно работает при нескольких фасовках (SKU) одного товара
 * @param {number} quantity - Новое количество (0 для удаления)
 * @returns {Promise<Object>} Обновлённые данные корзины
 */
export const updateCartItem = async (cartItemId, quantity) => {
  return await api.put('/shop/cart/item/', {
    cart_item_id: cartItemId,
    quantity
  })
}

/**
 * Удаление товара из корзины
 *
 * @param {number} cartItemId - ID строки корзины (CartItem.id)
 * @returns {Promise<Object>} Обновлённые данные корзины
 */
export const removeFromCart = async (cartItemId) => {
  return await api.delete('/shop/cart/item/', {
    data: { cart_item_id: cartItemId }
  })
}

/**
 * Удаление курса из корзины по course_id
 * 
 * @param {number} courseId - ID курса для удаления
 * @returns {Promise<Object>} Обновлённые данные корзины
 */
export const removeCourseFromCart = async (courseId) => {
  // Используем DELETE с course_id в data
  // Бэкенд должен поддерживать удаление курсов
  return await api.delete('/shop/cart/item/', {
    data: { course_id: courseId }
  })
}

/**
 * Обновление корзины (refreshCart)
 * 
 * @returns {Promise<Object>} Актуальное состояние корзины
 */
export const refreshCart = async () => {
  return await api.get('/shop/cart/refresh/')
}

// =============================================================================
// ЗАКАЗЫ
// =============================================================================

/**
 * Получение информации для оформления заказа
 * 
 * @returns {Promise<Object>} Детальная информация о заказе, адресах и доставке
 */
export const getCheckoutInfo = async () => {
  return await api.get('/shop/checkout/')
}

/**
 * Создание заказа с расширенными данными
 * 
 * Оформляет заказ с текущим содержимым корзины и очищает корзину.
 * 
 * @param {Object} orderData - Данные заказа
 * @param {string} [orderData.shipping_address] - Адрес доставки (текст)
 * @param {string} [orderData.address_id] - ID сохраненного адреса
 * @param {string} [orderData.delivery_type] - Тип доставки ('standard', 'express', 'pickup')
 * @param {number} [orderData.delivery_cost] - Стоимость доставки
 * @param {string} [orderData.recipient_name] - Имя получателя
 * @param {string} [orderData.recipient_phone] - Телефон получателя
 * @returns {Promise<Object>} Данные созданного заказа
 * @throws {Object} Ошибка если корзина пуста
 * 
 * @example
 *   const { order } = await createOrder({
 *     address_id: '123',
 *     delivery_type: 'standard',
 *     delivery_cost: 500
 *   })
 */
export const createOrder = async (orderData) => {
  return await api.post('/shop/orders/', orderData)
}

/**
 * Получение истории заказов пользователя
 * 
 * @returns {Promise<Object>} Массив заказов и количество
 */
export const getOrders = async () => {
  return await api.get('/shop/orders/history/')
}

/**
 * Получение деталей заказа
 *
 * @param {string} orderId - ID заказа
 * @returns {Promise<Object>} Детали заказа
 */
export const getOrderDetails = async (orderId) => {
  return await api.get(`/shop/orders/${orderId}/`)
}

/**
 * Обновление заказа
 * 
 * @param {string} orderId - ID заказа
 * @param {Object} orderData - Данные для обновления
 * @param {string} [orderData.delivery_type] - Тип доставки ('standard', 'express', 'pickup')
 * @param {string} [orderData.shipping_address] - Адрес доставки
 * @param {string} [orderData.address_id] - ID сохраненного адреса
 * @returns {Promise<Object>} Обновленный заказ
 */
export const updateOrder = async (orderId, orderData) => {
  return await api.patch(`/shop/orders/${orderId}/`, orderData)
}

/**
 * Отмена заказа пользователем
 *
 * Доступно только для неоплаченных заказов (статус pending/expired).
 * Возвращает товары на склад и отменяет связанные платежи.
 *
 * @param {string} orderId - ID заказа
 * @param {string} [reason] - Причина отмены (опционально)
 * @returns {Promise<Object>} Обновлённый заказ
 */
export const cancelOrder = async (orderId, reason = '') => {
  return await api.post(`/shop/orders/${orderId}/cancel/`, reason ? { reason } : {})
}

// =============================================================================
// АДРЕСА
// =============================================================================

/**
 * Получение списка адресов пользователя
 * 
 * @returns {Promise<Object>} Список адресов
 */
export const getAddresses = async () => {
  return await api.get('/shop/addresses/')
}

/**
 * Создание нового адреса
 * 
 * @param {Object} addressData - Данные адреса
 * @returns {Promise<Object>} Созданный адрес
 */
export const createAddress = async (addressData) => {
  return await api.post('/shop/addresses/', addressData)
}

/**
 * Поиск адресов
 * 
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Object>} Предложения адресов
 */
export const searchAddresses = async (query) => {
  return await api.get(`/shop/addresses/search/?query=${encodeURIComponent(query)}`)
}

// =============================================================================
// ЕДИНЫЙ CHECKOUT
// =============================================================================

/**
 * Получение данных для единого checkout
 * 
 * Загружает товары, курсы из корзины, адреса пользователя и варианты доставки.
 * Автоматически резервирует товары на 10 минут.
 * 
 * @param {number[]} [selectedItems] - Массив ID элементов корзины (опционально)
 * @returns {Promise<Object>} Данные для checkout
 * @example
 * {
 *   products: { items: [...], subtotal: 3500, delivery_options: [...] },
 *   courses: { items: [...], subtotal: 5000 },
 *   addresses: [...],
 *   totals: { products: 3500, courses: 5000, delivery: 0, grand_total: 8500 },
 *   reservation: { id: "uuid", expires_at: "2024-01-01T12:10:00Z" },
 *   selected_items: [1, 2, 3]
 * }
 */
export const getUnifiedCheckout = async (selectedItems = []) => {
  const params = selectedItems.length > 0
    ? `?selected_items=${selectedItems.join(',')}`
    : ''
  return await api.get(`/checkout/${params}`)
}

/**
 * Отправка единого заказа
 * 
 * Создаёт заказы для товаров и/или курсов одним запросом.
 * Поддерживает выборочное оформление через selected_items.
 * 
 * @param {Object} checkoutData - Данные оформления
 * @param {number[]} [checkoutData.selected_items] - Массив ID элементов корзины для оформления
 * @param {string} [checkoutData.delivery_type] - Тип доставки (standard | express | pickup)
 * @param {string} [checkoutData.address_id] - UUID сохранённого адреса
 * @param {string} [checkoutData.shipping_address] - Текстовый адрес доставки
 * @param {boolean} [checkoutData.courses_disclaimer_accepted] - Согласие с условиями курсов
 * @returns {Promise<Object>} Данные созданных заказов и ссылка на оплату
 * @example
 * {
 *   reservation_id: "uuid",
 *   orders: { products_order: {...}, courses: [...] },
 *   payment: { id: "uuid", amount: 8500, url: "https://..." }
 * }
 */
export const submitUnifiedCheckout = async (checkoutData) => {
  return await api.post('/checkout/', checkoutData)
}

/**
 * Отмена резервирования
 * 
 * Освобождает зарезервированные товары раньше таймаута.
 * 
 * @param {string} reservationId - UUID резервирования
 * @returns {Promise<Object>} Статус отмены
 */
export const cancelReservation = async (reservationId) => {
  return await api.delete(`/checkout/reservation/${reservationId}/`)
}

// =============================================================================
// ВОЗВРАТЫ
// =============================================================================

/**
 * Создание запроса на возврат товара
 *
 * @param {Object} returnData - Данные возврата
 * @param {number} returnData.order_item_id - ID элемента заказа
 * @param {number} returnData.quantity - Количество для возврата
 * @param {string} returnData.reason - Причина возврата
 * @param {string} [returnData.description] - Описание
 * @returns {Promise<Object>} Данные созданного возврата
 */
export const createReturn = async (returnData) => {
  return await api.post('/shop/returns/', returnData)
}

/**
 * Получение списка возвратов пользователя
 *
 * @returns {Promise<Object>} Список возвратов
 */
export const getReturns = async () => {
  return await api.get('/shop/returns/list/')
}

/**
 * Получение деталей возврата
 *
 * @param {string} returnId - ID возврата
 * @returns {Promise<Object>} Детали возврата
 */
export const getReturn = async (returnId) => {
  return await api.get(`/shop/returns/${returnId}/`)
}

// =============================================================================
// КОНСТАНТЫ
// =============================================================================

/**
 * Доступные проблемы здоровья для фильтрации
 */
export const HEALTH_ISSUES = [
  { code: 'overweight', label: 'Для контроля веса' },
  { code: 'sensitive_digestion', label: 'Для чувствительного пищеварения' },
  { code: 'skin_issues', label: 'Для здоровья кожи и шерсти' },
  { code: 'joint_problems', label: 'Для здоровья суставов' },
  { code: 'dental_issues', label: 'Для здоровья зубов' },
  { code: 'allergies', label: 'Гипоаллергенный' },
  { code: 'kidney_issues', label: 'Для здоровья почек' },
  { code: 'heart_issues', label: 'Для здоровья сердца' },
]

/**
 * Доступные варианты фильтра по типу животного
 */
export const PET_TYPE_OPTIONS = [
  { value: '', label: 'Все животные' },
  { value: 'dog', label: 'Собак' },
  { value: 'cat', label: 'Кошек' },
]

/**
 * Доступные варианты фильтра по типу товара
 */
export const PRODUCT_TYPE_OPTIONS = [
  { value: '', label: 'Все категории' },
  { value: 'dry_food', label: 'Сухой корм' },
  { value: 'wet_food', label: 'Влажный корм' },
  { value: 'treats', label: 'Лакомства' },
]

// =============================================================================
// КОНСТАНТЫ V2 (Новая структура)
// =============================================================================

/**
 * Группы товаров
 */
export const PRODUCT_GROUP_OPTIONS = [
  { value: '', label: 'Все группы' },
  { value: 'food', label: 'Корм' },
  { value: 'treats', label: 'Лакомства' },
  { value: 'vet', label: 'Ветеринарные препараты' },
  { value: 'vitamins', label: 'Витамины и добавки' },
  { value: 'care', label: 'Средства ухода' },
  { value: 'accessories', label: 'Аксессуары' },
  { value: 'toys', label: 'Игрушки' },
]

/**
 * Возрастные группы
 */
export const AGE_GROUP_OPTIONS = [
  { value: '', label: 'Все возрасты' },
  { value: 'puppy', label: 'Щенок' },
  { value: 'kitten', label: 'Котёнок' },
  { value: 'adult', label: 'Взрослый' },
  { value: 'senior', label: 'Пожилой' },
]

/**
 * Размерные группы
 */
export const SIZE_GROUP_OPTIONS = [
  { value: '', label: 'Все размеры' },
  { value: 'mini', label: 'Миниатюрный' },
  { value: 'small', label: 'Маленький' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Крупный' },
  { value: 'giant', label: 'Гигантский' },
]

/**
 * Boolean-фильтры для кормов
 */
export const FOOD_BOOLEAN_FILTERS = [
  { key: 'is_grain_free', label: 'Беззерновой', icon: '🌾' },
  { key: 'is_hypoallergenic', label: 'Гипоаллергенный', icon: '🛡️' },
  { key: 'is_veterinary', label: 'Ветеринарная диета', icon: '⚕️' },
]

/**
 * Показания по здоровью
 */
export const HEALTH_CONDITIONS = [
  { value: 'urinary', label: 'Мочевыделительная система' },
  { value: 'obesity', label: 'Контроль веса' },
  { value: 'joint', label: 'Суставы и мобильность' },
  { value: 'skin', label: 'Кожа и шерсть' },
  { value: 'digestive', label: 'Пищеварение' },
  { value: 'kidney', label: 'Почки' },
  { value: 'liver', label: 'Печень' },
  { value: 'cardiac', label: 'Сердце' },
  { value: 'dental', label: 'Зубы и полость рта' },
  { value: 'diabetes', label: 'Диабет' },
]

/**
 * Опции сортировки
 */
export const SORT_OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'price_asc', label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'popularity', label: 'По популярности' },
  { value: 'newest', label: 'Сначала новые' },
]
