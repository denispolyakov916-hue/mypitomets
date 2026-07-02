/**
 * Хранилище корзины покупок (Zustand)
 * 
 * Управляет состоянием корзины:
 * - Элементы корзины с деталями товаров
 * - Выбранные элементы для оформления
 * - Расчёт общей суммы
 * - Операции с корзиной (добавление, обновление, удаление)
 * 
 * Корзина синхронизируется с API бэкенда для авторизованных пользователей.
 * 
 * Использование:
 *   import { useCartStore } from './store/cartStore'
 *   
 *   const { items, total, addItem, loadCart, selectedItems } = useCartStore()
 */

import { create } from 'zustand'
import * as shopApi from '../api/shop'
import * as coursesApi from '../api/courses'
import { apiCache } from '../utils/apiCache'
import { handleStoreError } from './baseStore'

/**
 * Автоматическое обновление корзины
 *
 * Обновляет количество товаров в корзине каждые 60 секунд.
 * Это обеспечивает актуальность данных в UI без ручных обновлений.
 */
let cartRefreshInterval = null

const startCartAutoRefresh = (store) => {
  // Останавливаем предыдущий интервал, если он существует
  if (cartRefreshInterval) {
    clearInterval(cartRefreshInterval)
  }

  // Запускаем автоматическое обновление каждые 60 секунд
  cartRefreshInterval = setInterval(async () => {
    try {
      // Обновляем только itemsCount и total, без полной перезагрузки items
      // чтобы не мешать пользователю работать с корзиной
      const response = await shopApi.getCart()
      store.setState({
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0
      })
    } catch (error) {
      // Игнорируем ошибки автоматического обновления
      console.debug('Не удалось автоматически обновить корзину:', error.message)
    }
  }, 60000) // 60 секунд
}

const stopCartAutoRefresh = () => {
  if (cartRefreshInterval) {
    clearInterval(cartRefreshInterval)
    cartRefreshInterval = null
  }
}

/**
 * Отложенное добавление товара в корзину для гостей (P1.6).
 *
 * Когда неавторизованный пользователь нажимает «В корзину», мы сохраняем
 * товар в localStorage и отправляем его на /login?redirect=<путь>. После входа
 * страница магазина/товара вызывает replayPendingCartAdd() и товар попадает
 * в корзину автоматически — пользователь возвращается туда, где был.
 */
const PENDING_CART_KEY = 'petplus_pending_cart_add'
// Срок жизни отложенного добавления — 30 минут (защита от «зависших» товаров).
const PENDING_CART_TTL_MS = 30 * 60 * 1000

/**
 * Сохранить отложенное добавление товара (гость → логин).
 *
 * @param {number|string} productId - ID товара
 * @param {number} [quantity=1] - Количество
 */
export const setPendingCartAdd = (productId, quantity = 1) => {
  try {
    if (!productId) return
    localStorage.setItem(
      PENDING_CART_KEY,
      JSON.stringify({ productId, quantity: quantity || 1, savedAt: Date.now() })
    )
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — тихо игнорируем
  }
}

/** Прочитать и удалить отложенное добавление (если оно не протухло). */
const consumePendingCartAdd = () => {
  try {
    const raw = localStorage.getItem(PENDING_CART_KEY)
    if (!raw) return null
    localStorage.removeItem(PENDING_CART_KEY)
    const data = JSON.parse(raw)
    if (!data || !data.productId) return null
    if (data.savedAt && Date.now() - data.savedAt > PENDING_CART_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

/**
 * Хранилище корзины
 * 
 * Состояние:
 *   items: Массив элементов корзины с деталями товаров
 *   total: Общая сумма корзины
 *   itemsCount: Общее количество товаров
 *   selectedItems: Set с ID выбранных элементов
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
 *   toggleItemSelection: Переключить выбор элемента
 *   selectAllItems: Выбрать все элементы
 *   deselectAllItems: Снять выбор со всех элементов
 */
export const useCartStore = create((set, get) => ({
  // Начальное состояние
  items: [],
  total: 0,
  itemsCount: 0,
  selectedItems: new Set(),
  isLoading: false,
  error: null,
  // Флаги для защиты от дублирования запросов
  _loadingPromise: null,
  _refreshPromise: null,
  _lastLoadTime: 0,
  
  /**
   * Загрузка корзины из API
   * 
   * Получает текущее состояние корзины с сервера.
   * Вызывается после входа или при монтировании страницы корзины.
   * Бэкенд возвращает: {products: [...], courses: [...], totals: {...}, items_count}
   * Автоматически выбирает все элементы после загрузки.
   * 
   * Защита от дублирования: если запрос уже выполняется, возвращает существующий промис.
   * Также не выполняет запрос, если данные были загружены менее 2 секунд назад.
   * 
   * @param {boolean} force - Принудительно перезагрузить, игнорируя кэш
   * @returns {Promise<boolean>} True если загрузка успешна
   */
  loadCart: async (force = false) => {
    const state = get()
    
    // Если запрос уже выполняется - возвращаем существующий промис
    if (state._loadingPromise) {
      return state._loadingPromise
    }
    
    // Если данные были загружены недавно и нет принудительной перезагрузки - пропускаем
    const now = Date.now()
    if (!force && state._lastLoadTime && (now - state._lastLoadTime) < 2000) {
      return true
    }

    const loadPromise = (async () => {
      set({ isLoading: true, error: null })

      try {
        const response = await shopApi.getCart()

        // Бэкенд уже возвращает правильную структуру с products/courses отдельно
        const products = response.products || []
        const courses = response.courses || []
        const allItems = [...products, ...courses]

        // Автоматически выбираем все элементы
        const allIds = new Set(allItems.map(item => item.id))

        set({
          items: allItems,
          total: response.totals?.total || 0,
          itemsCount: response.items_count || 0,
          selectedItems: allIds,
          isLoading: false,
          error: null,
          _loadingPromise: null,
          _lastLoadTime: Date.now()
        })

        // Инвалидируем кэш счетчиков после загрузки корзины
        apiCache.invalidate('cart-count')

        return true
      } catch (error) {
        handleStoreError(error, set, 'Не удалось загрузить корзину')
        set({
          items: [],
          total: 0,
          itemsCount: 0,
          selectedItems: new Set(),
          _loadingPromise: null
        })
        return false
      }
    })()
    
    set({ _loadingPromise: loadPromise })
    return loadPromise
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
      const { items: currentItems } = get()
      const response = await shopApi.addToCart(productId, quantity)

      // POST возвращает: {products: [...], courses: [...], totals: {...}, items_count}
      const products = response.products || []
      const courses = response.courses || []
      const newItems = [...products, ...courses]

      // Сохраняем порядок элементов
      const newItemsMap = new Map(newItems.map(item => [item.id, item]))
      const orderedItems = []
      
      // Сначала добавляем существующие элементы в том же порядке
      for (const currentItem of currentItems) {
        if (newItemsMap.has(currentItem.id)) {
          orderedItems.push(newItemsMap.get(currentItem.id))
          newItemsMap.delete(currentItem.id)
        }
      }
      
      // Затем добавляем новые элементы (если есть)
      for (const newItem of newItemsMap.values()) {
        orderedItems.push(newItem)
      }

      set({
        items: orderedItems,
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0,
        isLoading: false,
        error: null
      })

      // Инвалидируем кэш счетчиков после изменения корзины
      apiCache.invalidate('cart-count')

      return true
    } catch (error) {
      handleStoreError(error, set, 'Не удалось добавить товар')
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
      const { items: currentItems } = get()
      const response = await shopApi.addCourseToCart(courseId, petId, disclaimerAccepted)

      // POST возвращает: {products: [...], courses: [...], totals: {...}, items_count}
      const products = response.products || []
      const courses = response.courses || []
      const newItems = [...products, ...courses]

      // Сохраняем порядок элементов
      const newItemsMap = new Map(newItems.map(item => [item.id, item]))
      const orderedItems = []
      
      // Сначала добавляем существующие элементы в том же порядке
      for (const currentItem of currentItems) {
        if (newItemsMap.has(currentItem.id)) {
          orderedItems.push(newItemsMap.get(currentItem.id))
          newItemsMap.delete(currentItem.id)
        }
      }
      
      // Затем добавляем новые элементы (если есть)
      for (const newItem of newItemsMap.values()) {
        orderedItems.push(newItem)
      }

      set({
        items: orderedItems,
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0,
        isLoading: false
      })

      // Инвалидируем кэш счетчиков после изменения корзины
      apiCache.invalidate('cart-count')

      return true
    } catch (error) {
      handleStoreError(error, set, 'Не удалось добавить курс в корзину')
      return false
    }
  },
  
  /**
   * Обновление количества товара
   *
   * Оптимистичное обновление: сразу меняет количество в локальном состоянии
   * (только затронутая строка + пересчёт totals), затем синхронизирует с сервером.
   * При ошибке откатывает изменение к предыдущему состоянию.
   *
   * НЕ выставляет глобальный isLoading, чтобы не перемонтировать всю корзину
   * (страница показывает PageLoader только при первичной загрузке).
   *
   * @param {number} cartItemId - ID строки корзины (CartItem.id) — однозначный ключ,
   *   корректный при нескольких фасовках (SKU) одного товара
   * @param {number} quantity - Новое количество (0 для удаления)
   * @returns {Promise<boolean>} True если обновление успешно
   */
  updateQuantity: async (cartItemId, quantity) => {
    const { items: prevItems, itemsCount: prevCount } = get()

    // Оптимистично обновляем только затронутую строку — по id строки корзины (не product.id,
    // иначе при двух фасовках одного товара задели бы обе строки).
    // quantity === 0 — удаление: убираем строку из списка.
    const optimisticItems = quantity === 0
      ? prevItems.filter(item => item.id !== cartItemId)
      : prevItems.map(item =>
          item.id === cartItemId
            ? { ...item, quantity }
            : item
        )

    set({ items: optimisticItems, error: null })

    try {
      const response = await shopApi.updateCartItem(cartItemId, quantity)

      // PUT возвращает: {products: [...], courses: [...], totals: {...}, items_count}
      const products = response.products || []
      const courses = response.courses || []
      const newItems = [...products, ...courses]

      // Сохраняем порядок элементов: обновляем существующие и добавляем новые в конец
      // Создаем Map для быстрого поиска по ID элемента корзины
      const newItemsMap = new Map(newItems.map(item => [item.id, item]))
      const orderedItems = []

      // Сначала добавляем существующие элементы в том же порядке.
      // Берём за основу оптимистичный список, чтобы сохранить актуальный порядок строк.
      for (const currentItem of optimisticItems) {
        if (newItemsMap.has(currentItem.id)) {
          orderedItems.push(newItemsMap.get(currentItem.id))
          newItemsMap.delete(currentItem.id)
        }
      }

      // Затем добавляем новые элементы (если есть)
      for (const newItem of newItemsMap.values()) {
        orderedItems.push(newItem)
      }

      set({
        items: orderedItems,
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0
      })

      // Инвалидируем кэш счетчиков после изменения корзины
      apiCache.invalidate('cart-count')

      return true
    } catch (error) {
      // Откат: восстанавливаем предыдущее состояние строки/корзины
      set({ items: prevItems, itemsCount: prevCount })
      handleStoreError(error, set, 'Не удалось обновить количество')
      return false
    }
  },
  
  /**
   * Удаление товара из корзины
   * 
   * @param {number} cartItemId - ID строки корзины (CartItem.id)
   * @returns {Promise<boolean>} True если удаление успешно
   */
  removeItem: async (cartItemId) => {
    return get().updateQuantity(cartItemId, 0)
  },
  
  /**
   * Удаление курса из корзины по course_id
   *
   * @param {number} courseId - ID курса для удаления
   * @returns {Promise<boolean>} True если удаление успешно
   */
  removeCourse: async (courseId) => {
    set({ isLoading: true, error: null })

    try {
      const response = await shopApi.removeCourseFromCart(courseId)

      // response содержит: {products: [...], courses: [...], totals: {...}, items_count}
      const items = [...response.products, ...response.courses]

      set({
        items: items,
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0,
        isLoading: false
      })

      // Инвалидируем кэш счетчиков после изменения корзины
      apiCache.invalidate('cart-count')

      return true
    } catch (error) {
      handleStoreError(error, set, 'Не удалось удалить курс из корзины')
      return false
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

    // Инвалидируем кэш счетчиков после очистки корзины
    apiCache.invalidate('cart-count')
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

      // Инвалидируем кэш счетчиков после оформления заказа
      apiCache.invalidate('cart-count')
      
      return response.order
    } catch (error) {
      handleStoreError(error, set, 'Не удалось оформить заказ')
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
   * Повторить отложенное добавление товара после входа (P1.6).
   *
   * Вызывается на странице магазина/товара, когда пользователь уже авторизован.
   * Если в localStorage есть сохранённый товар (гость нажал «В корзину» до входа) —
   * добавляет его в корзину и возвращает его id, иначе возвращает null.
   *
   * @returns {Promise<{productId: number|string, quantity: number}|null>}
   */
  replayPendingCartAdd: async () => {
    const pending = consumePendingCartAdd()
    if (!pending) return null
    try {
      const ok = await get().addItem(pending.productId, pending.quantity || 1)
      return ok ? pending : null
    } catch (error) {
      console.error('Не удалось добавить отложенный товар в корзину:', error)
      return null
    }
  },

  /**
   * Обновление только количества товаров (быстрое обновление для UI)
   * Используется для автоматического обновления бейджей без полной перезагрузки корзины
   *
   * Использует глобальное кэширование для предотвращения дублированных запросов.
   */
  refreshCount: async () => {
    try {
      // Используем глобальное кэширование с коротким TTL (10 секунд для счетчиков)
      const response = await apiCache.get('cart-count', shopApi.getCart, 10000)
      set({
        total: response.totals?.total || 0,
        itemsCount: response.items_count || 0,
        _lastLoadTime: Date.now()
      })
      return true
    } catch (error) {
      console.error('Ошибка обновления количества товаров:', error)
      return false
    }
  },
  
  /**
   * Очистка состояния ошибки
   */
  clearError: () => {
    set({ error: null })
  },

  /**
   * Переключить выбор элемента
   * 
   * @param {number} itemId - ID элемента корзины
   */
  toggleItemSelection: (itemId) => {
    const { selectedItems } = get()
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    set({ selectedItems: newSelected })
  },

  /**
   * Установить выбор элемента
   * 
   * @param {number} itemId - ID элемента корзины
   * @param {boolean} isSelected - Выбран или нет
   */
  setItemSelection: (itemId, isSelected) => {
    const { selectedItems } = get()
    const newSelected = new Set(selectedItems)
    if (isSelected) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    set({ selectedItems: newSelected })
  },

  /**
   * Выбрать все элементы
   */
  selectAllItems: () => {
    const { items } = get()
    const allIds = new Set(items.map(item => item.id))
    set({ selectedItems: allIds })
  },

  /**
   * Снять выбор со всех элементов
   */
  deselectAllItems: () => {
    set({ selectedItems: new Set() })
  },

  /**
   * Выбрать все товары
   */
  selectAllProducts: () => {
    const { items, selectedItems } = get()
    const newSelected = new Set(selectedItems)
    items.forEach(item => {
      const isCourse = item.course !== undefined && item.course !== null
      if (!isCourse) {
        newSelected.add(item.id)
      }
    })
    set({ selectedItems: newSelected })
  },

  /**
   * Снять выбор со всех товаров
   */
  deselectAllProducts: () => {
    const { items, selectedItems } = get()
    const newSelected = new Set(selectedItems)
    items.forEach(item => {
      const isCourse = item.course !== undefined && item.course !== null
      if (!isCourse) {
        newSelected.delete(item.id)
      }
    })
    set({ selectedItems: newSelected })
  },

  /**
   * Выбрать все курсы
   */
  selectAllCourses: () => {
    const { items, selectedItems } = get()
    const newSelected = new Set(selectedItems)
    items.forEach(item => {
      const isCourse = item.course !== undefined && item.course !== null
      if (isCourse) {
        newSelected.add(item.id)
      }
    })
    set({ selectedItems: newSelected })
  },

  /**
   * Снять выбор со всех курсов
   */
  deselectAllCourses: () => {
    const { items, selectedItems } = get()
    const newSelected = new Set(selectedItems)
    items.forEach(item => {
      const isCourse = item.course !== undefined && item.course !== null
      if (isCourse) {
        newSelected.delete(item.id)
      }
    })
    set({ selectedItems: newSelected })
  },

  /**
   * Получить сумму выбранных элементов
   * 
   * @returns {number} Сумма выбранных элементов
   */
  getSelectedTotal: () => {
    const { items, selectedItems } = get()
    return items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => {
        const isCourse = item.course !== undefined && item.course !== null
        const price = isCourse 
          ? (item.course?.price || 0)
          : (item.product?.discounted_price || item.product?.price || 0) * (item.quantity || 1)
        return sum + price
      }, 0)
  },

  /**
   * Проверить, есть ли товар в корзине
   *
   * @param {number} productId - ID товара для проверки
   * @returns {Object|null} Объект товара из корзины или null
   */
  getItemInCart: (productId) => {
    const { items } = get()
    return items.find(item => item.product?.id === productId) || null
  },

  /**
   * Проверить, есть ли курс в корзине
   *
   * @param {number} courseId - ID курса для проверки
   * @returns {Object|null} Объект курса из корзины или null
   */
  getCourseInCart: (courseId) => {
    const { items } = get()
    return items.find(item => item.course?.id === courseId) || null
  },

  /**
   * Получить массив ID выбранных элементов
   *
   * @returns {number[]} Массив ID
   */
  getSelectedItemIds: () => {
    return Array.from(get().selectedItems)
  },

  /**
   * Удаление выбранных элементов из корзины
   * 
   * @returns {Promise<boolean>} True если удаление успешно
   */
  removeSelectedItems: async () => {
    const { items, selectedItems, loadCart } = get()
    set({ isLoading: true, error: null })

    try {
      for (const itemId of selectedItems) {
        const item = items.find(i => i.id === itemId)
        if (item) {
          const isCourse = item.course !== undefined && item.course !== null
          if (isCourse) {
            await shopApi.removeCourseFromCart(item.course.id)
          } else if (item.product) {
            await shopApi.updateCartItem(item.id, 0)
          }
        }
      }

      // Перезагружаем корзину
      await loadCart()

      // Кэш уже инвалидирован в loadCart, но на всякий случай
      apiCache.invalidate('cart-count')

      return true
    } catch (error) {
      handleStoreError(error, set, 'Не удалось удалить выбранные элементы')
      return false
    }
  }
}))
