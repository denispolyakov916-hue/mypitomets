/**
 * Хранилище корзины покупок (Zustand)
 * 
 * Управляет состоянием корзины:
 * - Элементы корзины с деталями товаров
 * - Расчёт общей суммы
 * - Операции с корзиной (добавление, обновление, удаление)
 * 
 * Корзина синхронизируется с API бэкенда для авторизованных пользователей.
 * 
 * Использование:
 *   import { useCartStore } from './store/cartStore'
 *   
 *   const { items, total, addItem, loadCart } = useCartStore()
 */

import { create } from 'zustand'
import * as shopApi from '../api/shop'
import * as coursesApi from '../api/courses'

/**
 * Хранилище корзины
 * 
 * Состояние:
 *   items: Массив элементов корзины с деталями товаров
 *   total: Общая сумма корзины
 *   itemsCount: Общее количество товаров
 *   isLoading: Состояние загрузки
 *   error: Сообщение об ошибке
 * 
 * Действия:
 *   loadCart: Загрузка корзины из API
 *   addItem: Добавление товара в корзину
 *   updateQuantity: Изменение количества товара
 *   removeItem: Удаление из корзины
 *   clearCart: Очистка корзины локально
 *   checkout: Оформление заказа
 */
export const useCartStore = create((set, get) => ({
  // Начальное состояние
  items: [],
  total: 0,
  itemsCount: 0,
  isLoading: false,
  error: null,
  
  /**
   * Загрузка корзины из API
   * 
   * Получает текущее состояние корзины с сервера.
   * Вызывается после входа или при монтировании страницы корзины.
   * Бэкенд возвращает: {products: [...], courses: [...], totals: {...}, items_count}
   * 
   * @returns {Promise<boolean>} True если загрузка успешна
   */
  loadCart: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await shopApi.getCart()
      
      // Объединяем products и courses в один массив items
      const products = response.products || []
      const courses = response.courses || []
      const allItems = [...products, ...courses]
      
      set({
        items: allItems,
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0,
        isLoading: false
      })
      
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Не удалось загрузить корзину'
      })
      return false
    }
  },
  
  /**
   * Добавление товара в корзину
   * 
   * @param {number} productId - Товар для добавления
   * @param {number} [quantity=1] - Количество для добавления
   * @returns {Promise<boolean>} True если добавление успешно
   */
  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await shopApi.addToCart(productId, quantity)
      
      // POST возвращает: {cart: [...], total, items_count}
      const items = response.cart || []
      
      set({
        items: items,
        total: response.total || 0,
        itemsCount: response.items_count || items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        isLoading: false
      })
      
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Не удалось добавить товар'
      })
      return false
    }
  },
  
  /**
   * Добавление курса в корзину
   * 
   * @param {number} courseId - Курс для добавления
   * @param {string} [petId] - ID питомца для привязки курса (опционально)
   * @param {boolean} [disclaimerAccepted=false] - Согласие с условиями использования
   * @returns {Promise<boolean>} True если добавление успешно
   */
  addCourse: async (courseId, petId = null, disclaimerAccepted = false) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await shopApi.addCourseToCart(courseId, petId, disclaimerAccepted)
      
      // POST возвращает: {cart: [...], total, items_count, message}
      // cart - это массив всех элементов корзины (товары + курсы)
      const items = response.cart || []
      
      set({
        items: items,
        total: response.total || 0,
        itemsCount: response.items_count || items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        isLoading: false
      })
      
      return true
    } catch (error) {
      // Обработка ошибок от API
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Не удалось добавить курс в корзину'
      
      set({
        isLoading: false,
        error: errorMessage
      })
      return false
    }
  },
  
  /**
   * Обновление количества товара
   * 
   * @param {number} productId - Товар для обновления
   * @param {number} quantity - Новое количество (0 для удаления)
   * @returns {Promise<boolean>} True если обновление успешно
   */
  updateQuantity: async (productId, quantity) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await shopApi.updateCartItem(productId, quantity)
      
      // PUT возвращает: {cart: [...], total}
      const items = response.cart || []
      
      set({
        items: items,
        total: response.total || 0,
        itemsCount: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        isLoading: false
      })
      
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Не удалось обновить количество'
      })
      return false
    }
  },
  
  /**
   * Удаление товара из корзины
   * 
   * @param {number} productId - Товар для удаления
   * @returns {Promise<boolean>} True если удаление успешно
   */
  removeItem: async (productId) => {
    return get().updateQuantity(productId, 0)
  },
  
  /**
   * Удаление курса из корзины по ID элемента корзины
   * 
   * @param {number} cartItemId - ID элемента корзины (для курсов)
   * @returns {Promise<boolean>} True если удаление успешно
   */
  removeCourseItem: async (cartItemId) => {
    set({ isLoading: true, error: null })
    
    try {
      // Используем DELETE с course_id через обходной путь
      // Или перезагружаем корзину после удаления через API
      await shopApi.removeFromCart(cartItemId)
      
      // Перезагружаем корзину для получения актуального состояния
      const success = await get().loadCart()
      
      set({ isLoading: false })
      return success
    } catch (error) {
      // Если не получилось через стандартный API, пробуем через обновление корзины
      try {
        const success = await get().loadCart()
        set({ isLoading: false })
        return success
      } catch (err) {
        set({
          isLoading: false,
          error: error.message || 'Не удалось удалить курс из корзины'
        })
        return false
      }
    }
  },
  
  /**
   * Очистка корзины локально
   * 
   * Сбрасывает состояние корзины без API запроса.
   * Используется после успешного оформления заказа.
   */
  clearCart: () => {
    set({
      items: [],
      total: 0,
      itemsCount: 0,
      error: null
    })
  },
  
  /**
   * Оформление заказа (checkout)
   * 
   * Создаёт заказ из содержимого корзины.
   * Очищает корзину при успехе.
   * 
   * @param {string} shippingAddress - Адрес доставки
   * @returns {Promise<Object|null>} Данные заказа или null при ошибке
   */
  checkout: async (shippingAddress) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await shopApi.createOrder(shippingAddress)
      
      // Очищаем корзину при успешном заказе
      set({
        items: [],
        total: 0,
        itemsCount: 0,
        isLoading: false
      })
      
      return response.order
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Не удалось оформить заказ'
      })
      return null
    }
  },
  
  /**
   * Обновление корзины (алиас для loadCart)
   */
  refreshCart: async () => {
    return get().loadCart()
  },
  
  /**
   * Очистка состояния ошибки
   */
  clearError: () => {
    set({ error: null })
  }
}))
