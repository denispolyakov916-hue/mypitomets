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
   * 
   * @returns {Promise<boolean>} True если загрузка успешна
   */
  loadCart: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await shopApi.getCart()
      
      set({
        items: response.cart || [],
        total: response.total || 0,
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
      
      set({
        items: response.cart || [],
        total: response.total || 0,
        itemsCount: (response.cart || []).reduce((sum, item) => sum + item.quantity, 0),
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
      
      set({
        items: response.cart || [],
        total: response.total || 0,
        itemsCount: (response.cart || []).reduce((sum, item) => sum + item.quantity, 0),
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
   * Очистка состояния ошибки
   */
  clearError: () => {
    set({ error: null })
  }
}))
