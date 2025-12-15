/**
 * Хранилище аутентификации (Zustand)
 * 
 * Управляет глобальным состоянием аутентификации:
 * - Данные пользователя
 * - Статус аутентификации
 * - Действия входа/выхода
 * 
 * Состояние сохраняется через токены в localStorage.
 * Хранилище восстанавливается при загрузке приложения проверкой существующего токена.
 * 
 * Использование:
 *   import { useAuthStore } from './store/authStore'
 *   
 *   // В компоненте:
 *   const { user, isAuthenticated, login, logout } = useAuthStore()
 */

import { create } from 'zustand'
import * as authApi from '../api/auth'

/**
 * Проверка аутентификации при загрузке приложения
 * 
 * Читает токен из localStorage для определения начального состояния.
 * Не верифицирует токен на сервере (делается при первом API запросе).
 * 
 * @returns {boolean} True если access токен существует
 */
const getInitialAuthState = () => {
  return !!localStorage.getItem('access_token')
}

/**
 * Хранилище аутентификации
 * 
 * Состояние:
 *   user: Объект пользователя или null
 *   isAuthenticated: Флаг аутентификации
 *   isLoading: Состояние загрузки для операций авторизации
 *   error: Сообщение об ошибке последней операции
 * 
 * Действия:
 *   login: Аутентификация пользователя по учётным данным
 *   register: Создание нового аккаунта
 *   logout: Очистка состояния авторизации
 *   setUser: Обновление данных пользователя
 *   clearError: Сброс состояния ошибки
 *   loadProfile: Загрузка профиля пользователя из API
 */
export const useAuthStore = create((set, get) => ({
  // Начальное состояние
  user: null,
  isAuthenticated: getInitialAuthState(),
  isLoading: false,
  error: null,
  
  /**
   * Вход по email и паролю
   * 
   * Аутентифицирует пользователя, сохраняет токены и обновляет состояние.
   * 
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль пользователя
   * @returns {Promise<boolean>} True если вход успешен
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await authApi.login(email, password)
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Ошибка входа'
      })
      return false
    }
  },
  
  /**
   * Регистрация нового аккаунта
   * 
   * Создаёт аккаунт, сохраняет токены и выполняет вход.
   * 
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль пользователя
   * @param {string} passwordConfirm - Подтверждение пароля
   * @returns {Promise<boolean>} True если регистрация успешна
   */
  register: async (email, password, passwordConfirm) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await authApi.register(email, password, passwordConfirm)
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Ошибка регистрации'
      })
      return false
    }
  },
  
  /**
   * Выход текущего пользователя
   * 
   * Очищает токены и сбрасывает состояние авторизации.
   */
  logout: () => {
    authApi.logout()
    
    set({
      user: null,
      isAuthenticated: false,
      error: null
    })
  },
  
  /**
   * Обновление данных пользователя в хранилище
   * 
   * @param {Object} user - Данные пользователя для установки
   */
  setUser: (user) => {
    set({ user })
  },
  
  /**
   * Очистка состояния ошибки
   */
  clearError: () => {
    set({ error: null })
  },
  
  /**
   * Загрузка профиля пользователя из API
   * 
   * Вызывается после входа или при загрузке приложения для получения полного профиля.
   * 
   * @returns {Promise<Object|null>} Данные профиля или null при ошибке
   */
  loadProfile: async () => {
    if (!get().isAuthenticated) return null
    
    set({ isLoading: true })
    
    try {
      const profile = await authApi.getProfile()
      
      set({
        user: profile.user,
        isLoading: false
      })
      
      return profile
    } catch (error) {
      // Если загрузка профиля не удалась, возможно токен истёк
      if (error.status === 401) {
        get().logout()
      }
      
      set({ isLoading: false })
      return null
    }
  }
}))
