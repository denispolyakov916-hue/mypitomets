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
  const params = new URLSearchParams()
  
  // Добавляем только непустые фильтры
  const filterKeys = ['animal', 'pet_id', 'category', 'subcategory', 'vendor', 'min_price', 'max_price', 'in_stock', 'has_discount', 'search', 'page', 'per_page']
  
  filterKeys.forEach(key => {
    if (filters[key]) {
      params.append(key, filters[key])
    }
  })
  
  const queryString = params.toString()
  const url = queryString ? `/shop/products/?${queryString}` : '/shop/products/'
  
  return await api.get(url)
}

/**
 * Получение деталей одного товара
 * 
 * @param {number} productId - Уникальный идентификатор товара
 * @returns {Promise<Object>} Данные товара
 */
export const getProduct = async (productId) => {
  return await api.get(`/shop/products/${productId}/`)
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
  return await api.get('/shop/cart/')
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
 * @returns {Promise<Object>} Данные для checkout
 * @example
 * {
 *   products: { items: [...], subtotal: 3500, delivery_options: [...] },
 *   courses: { items: [...], subtotal: 5000 },
 *   addresses: [...],
 *   totals: { products: 3500, courses: 5000, delivery: 0, grand_total: 8500 },
 *   reservation: { id: "uuid", expires_at: "2024-01-01T12:10:00Z" }
 * }
 */
export const getUnifiedCheckout = async () => {
  return await api.get('/checkout/')
}

/**
 * Отправка единого заказа
 * 
 * Создаёт заказы для товаров и/или курсов одним запросом.
 * 
 * @param {Object} checkoutData - Данные оформления
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
// ВАРИАНТЫ ФИЛЬТРОВ
// =============================================================================

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
