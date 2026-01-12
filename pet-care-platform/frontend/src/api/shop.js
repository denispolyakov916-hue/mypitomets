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
const cartApi = createCrudApi('/shop/cart/')             // Корзина - CRUD
const ordersApi = createCrudApi('/shop/orders/')         // Заказы - CRUD
const addressesApi = createCrudApi('/shop/addresses/')   // Адреса - CRUD

// =============================================================================
// ТОВАРЫ
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

/**
 * Получение рекомендаций "Часто покупают вместе"
 *
 * @param {number} productId - Уникальный идентификатор товара
 * @returns {Promise<Object>} Рекомендации товаров
 */
export const getFrequentlyBoughtTogether = async (productId) => {
  return await api.get(`/shop/products/${productId}/frequently-bought/`)
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
 * Если товар уже в корзине, количество увеличивается.
 * 
 * @param {number} productId - Товар для добавления
 * @param {number} [quantity=1] - Количество для добавления
 * @returns {Promise<Object>} Обновлённые данные корзины
 * 
 * @example
 *   await addToCart(5, 2)  // Добавить 2 единицы товара #5
 */
export const addToCart = async (productId, quantity = 1) => {
  return await api.post('/shop/cart/', {
    product_id: productId,
    quantity
  })
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
 * @param {number} productId - Товар для обновления
 * @param {number} quantity - Новое количество (0 для удаления)
 * @returns {Promise<Object>} Обновлённые данные корзины
 */
export const updateCartItem = async (productId, quantity) => {
  return await api.put('/shop/cart/item/', {
    product_id: productId,
    quantity
  })
}

/**
 * Удаление товара из корзины
 * 
 * @param {number} productId - Товар для удаления
 * @returns {Promise<Object>} Обновлённые данные корзины
 */
export const removeFromCart = async (productId) => {
  return await api.delete('/shop/cart/item/', {
    data: { product_id: productId }
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
  { value: 'dog', label: 'Для собак' },
  { value: 'cat', label: 'Для кошек' },
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
