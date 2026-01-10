/**
 * Zustand store для управления избранным
 * 
 * Хранит ID избранных товаров и курсов в localStorage.
 * Синхронизируется с сервером при авторизации.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store избранного
 */
export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      // Списки избранного
      products: [], // массив объектов {id, addedAt}
      courses: [],  // массив объектов {id, addedAt}
      
      // Состояние синхронизации
      isSyncing: false,
      lastSyncedAt: null,
      
      /**
       * Добавить товар в избранное
       */
      addProduct: (productId) => {
        const { products } = get()
        const existingIndex = products.findIndex(p => p.id === productId)
        if (existingIndex === -1) {
          set({ products: [...products, { id: productId, addedAt: new Date().toISOString() }] })
        }
      },
      
      /**
       * Удалить товар из избранного
       */
      removeProduct: (productId) => {
        const { products } = get()
        set({ products: products.filter(p => p.id !== productId) })
      },
      
      /**
       * Переключить товар в избранном
       */
      toggleProduct: (productId) => {
        const { products, addProduct, removeProduct } = get()
        const exists = products.some(p => p.id === productId)
        if (exists) {
          removeProduct(productId)
          return false
        } else {
          addProduct(productId)
          return true
        }
      },
      
      /**
       * Проверить, в избранном ли товар
       */
      isProductFavorite: (productId) => {
        return get().products.some(p => p.id === productId)
      },
      
      /**
       * Добавить курс в избранное
       */
      addCourse: (courseId) => {
        const { courses } = get()
        const existingIndex = courses.findIndex(c => c.id === courseId)
        if (existingIndex === -1) {
          set({ courses: [...courses, { id: courseId, addedAt: new Date().toISOString() }] })
        }
      },
      
      /**
       * Удалить курс из избранного
       */
      removeCourse: (courseId) => {
        const { courses } = get()
        set({ courses: courses.filter(c => c.id !== courseId) })
      },
      
      /**
       * Переключить курс в избранном
       */
      toggleCourse: (courseId) => {
        const { courses, addCourse, removeCourse } = get()
        const exists = courses.some(c => c.id === courseId)
        if (exists) {
          removeCourse(courseId)
          return false
        } else {
          addCourse(courseId)
          return true
        }
      },
      
      /**
       * Проверить, в избранном ли курс
       */
      isCourseFavorite: (courseId) => {
        return get().courses.some(c => c.id === courseId)
      },
      
      /**
       * Получить количество избранного
       */
      getTotalCount: () => {
        const { products, courses } = get()
        return products.length + courses.length
      },

      /**
       * Получить все избранные товары как массив ID
       */
      getProductIds: () => {
        return get().products.map(p => p.id)
      },

      /**
       * Получить все избранные курсы как массив ID
       */
      getCourseIds: () => {
        return get().courses.map(c => c.id)
      },
      
      /**
       * Очистить всё избранное
       */
      clearAll: () => {
        set({ products: [], courses: [] })
      },
      
      /**
       * Очистить избранные товары
       */
      clearProducts: () => {
        set({ products: [] })
      },
      
      /**
       * Очистить избранные курсы
       */
      clearCourses: () => {
        set({ courses: [] })
      },
    }),
    {
      name: 'pet-favorites',
      version: 2,
      partialize: (state) => ({
        products: state.products,
        courses: state.courses,
      }),
      migrate: (persistedState, version) => {
        // Миграция с версии 1 на версию 2
        if (version === 1) {
          const migratedState = { ...persistedState }
          const now = new Date().toISOString()

          // Преобразуем массивы ID в массивы объектов {id, addedAt}
          if (Array.isArray(migratedState.products) && migratedState.products.length > 0) {
            // Проверяем, является ли первый элемент объектом или ID
            if (typeof migratedState.products[0] === 'object' && migratedState.products[0].id) {
              // Уже в новой структуре
              migratedState.products = migratedState.products
            } else {
              // Преобразуем массив ID в массив объектов
              migratedState.products = migratedState.products.map(id => ({
                id: id,
                addedAt: now
              }))
            }
          }

          if (Array.isArray(migratedState.courses) && migratedState.courses.length > 0) {
            // Проверяем, является ли первый элемент объектом или ID
            if (typeof migratedState.courses[0] === 'object' && migratedState.courses[0].id) {
              // Уже в новой структуре
              migratedState.courses = migratedState.courses
            } else {
              // Преобразуем массив ID в массив объектов
              migratedState.courses = migratedState.courses.map(id => ({
                id: id,
                addedAt: now
              }))
            }
          }

          return migratedState
        }
        return persistedState
      },
    }
  )
)

export default useFavoritesStore

