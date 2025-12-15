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
 * Получение каталога товаров
 * 
 * Возвращает все товары с опциональной фильтрацией.
 * Публичный эндпоинт - аутентификация не требуется.
 * 
 * @param {Object} [filters] - Опциональные фильтры
 * @param {string} [filters.pet_type] - Фильтр по животному ('dog', 'cat')
 * @param {string} [filters.product_type] - Фильтр по категории ('dry_food', 'wet_food', 'treats')
 * @returns {Promise<Object>} Массив товаров, количество и доступные фильтры
 * 
 * @example
 *   const { products } = await getProducts({ pet_type: 'dog' })
 */
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams()
  
  if (filters.pet_type) {
    params.append('pet_type', filters.pet_type)
  }
  if (filters.product_type) {
    params.append('product_type', filters.product_type)
  }
  
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

// =============================================================================
// ЗАКАЗЫ
// =============================================================================

/**
 * Создание заказа из корзины
 * 
 * Оформляет заказ с текущим содержимым корзины и очищает корзину.
 * 
 * @param {string} shippingAddress - Адрес доставки
 * @returns {Promise<Object>} Данные созданного заказа
 * @throws {Object} Ошибка если корзина пуста
 * 
 * @example
 *   const { order } = await createOrder('Москва, ул. Ленина, 1')
 */
export const createOrder = async (shippingAddress) => {
  return await api.post('/shop/orders/', {
    shipping_address: shippingAddress
  })
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
