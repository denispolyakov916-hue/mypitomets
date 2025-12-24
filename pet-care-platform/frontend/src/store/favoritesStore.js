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
      products: [], // массив ID товаров
      courses: [],  // массив ID курсов
      
      // Состояние синхронизации
      isSyncing: false,
      lastSyncedAt: null,
      
      /**
       * Добавить товар в избранное
       */
      addProduct: (productId) => {
        const { products } = get()
        if (!products.includes(productId)) {
          set({ products: [...products, productId] })
        }
      },
      
      /**
       * Удалить товар из избранного
       */
      removeProduct: (productId) => {
        const { products } = get()
        set({ products: products.filter(id => id !== productId) })
      },
      
      /**
       * Переключить товар в избранном
       */
      toggleProduct: (productId) => {
        const { products, addProduct, removeProduct } = get()
        if (products.includes(productId)) {
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
        return get().products.includes(productId)
      },
      
      /**
       * Добавить курс в избранное
       */
      addCourse: (courseId) => {
        const { courses } = get()
        if (!courses.includes(courseId)) {
          set({ courses: [...courses, courseId] })
        }
      },
      
      /**
       * Удалить курс из избранного
       */
      removeCourse: (courseId) => {
        const { courses } = get()
        set({ courses: courses.filter(id => id !== courseId) })
      },
      
      /**
       * Переключить курс в избранном
       */
      toggleCourse: (courseId) => {
        const { courses, addCourse, removeCourse } = get()
        if (courses.includes(courseId)) {
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
        return get().courses.includes(courseId)
      },
      
      /**
       * Получить количество избранного
       */
      getTotalCount: () => {
        const { products, courses } = get()
        return products.length + courses.length
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
      version: 1,
      partialize: (state) => ({
        products: state.products,
        courses: state.courses,
      }),
    }
  )
)

export default useFavoritesStore

