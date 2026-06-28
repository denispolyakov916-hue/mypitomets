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
  // Проверяем, что мы в браузере (не SSR)
  if (typeof window === 'undefined') {
    return false
  }
  
  try {
    return !!localStorage.getItem('access_token')
  } catch (error) {
    // Если localStorage недоступен (например, в приватном режиме)
    console.warn('Не удалось прочитать localStorage:', error)
    return false
  }
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
  tokenValidationInterval: null,
  
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

      // Запускаем периодическую проверку токена
      get().startTokenValidation()

      return true
    } catch (error) {
      // Обработка ошибок валидации
      const errorMessage = error.errors && error.errors.length > 0
        ? Object.values(error.errors).flat().join(', ')
        : error.message || 'Ошибка входа'

      set({
        isLoading: false,
        error: errorMessage
      })
      return false
    }
  },

  /**
   * Запросить SMS-код для входа/регистрации по номеру телефона.
   */
  requestPhoneCode: async (phone) => {
    set({ error: null })
    try {
      return await authApi.requestPhoneCode(phone)
    } catch (error) {
      const msg = error.message || 'Не удалось отправить код'
      set({ error: msg })
      throw error
    }
  },

  /**
   * Вход/регистрация по телефону: подтверждение SMS-кода.
   * При успехе создаётся (или находится) пользователь и выполняется вход.
   */
  loginWithPhone: async (phone, code) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authApi.verifyPhoneCode(phone, code)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      get().startTokenValidation()
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Неверный код',
      })
      return false
    }
  },

  /**
   * Регистрация нового аккаунта
   * 
   * Создаёт аккаунт, но НЕ выполняет автоматический вход.
   * Пользователь должен активировать аккаунт через email.
   * 
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль пользователя
   * @param {string} passwordConfirm - Подтверждение пароля
   * @returns {Promise<Object>} Результат регистрации с сообщением
   */
  register: async (email, password, passwordConfirm, firstName = '', lastName = '') => {
    set({ isLoading: true, error: null })

    try {
      const response = await authApi.register(email, password, passwordConfirm, firstName, lastName)
      
      // НЕ устанавливаем isAuthenticated - токены не выдаются
      set({
        isLoading: false,
        error: null
      })
      
      return response // Возвращаем ответ с сообщением
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Ошибка регистрации'
      })
      throw error
    }
  },
  
  /**
   * Активация аккаунта по коду
   * 
   * @param {string} activationCode - Код активации из email
   * @returns {Promise<boolean>} True если активация успешна
   */
  activateByCode: async (activationCode) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await authApi.activateByCode(activationCode)
      
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
        error: error.message || 'Ошибка активации'
      })
      return false
    }
  },
  
  /**
   * Повторная отправка кода активации
   * 
   * @param {string} email - Email пользователя
   * @returns {Promise<boolean>} True если отправка успешна
   */
  resendActivationCode: async (email) => {
    set({ isLoading: true, error: null })
    
    try {
      await authApi.resendActivationCode(email)
      set({ isLoading: false, error: null })
      return true
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Ошибка отправки кода'
      })
      return false
    }
  },
  
  /**
   * Выход текущего пользователя
   *
   * Очищает токены и сбрасывает состояние авторизации.
   */
  logout: async () => {
    await authApi.logout()

    // Останавливаем периодическую проверку токена
    get().stopTokenValidation()

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
   * Установка авторизации после успешного сброса пароля или другой операции
   * 
   * @param {Object} user - Данные пользователя
   * @param {string} accessToken - Access токен
   */
  setAuth: (user, accessToken) => {
    if (accessToken) {
      localStorage.setItem('access_token', accessToken)
    }
    set({
      user,
      isAuthenticated: true,
      error: null
    })
    // Запускаем периодическую проверку токена
    get().startTokenValidation()
  },
  
  /**
   * Очистка состояния ошибки
   */
  clearError: () => {
    set({ error: null })
  },
  
  /**
   * Проверка валидности токена и профиля
   *
   * Вызывается при загрузке приложения для проверки актуальности токена.
   * Если токен невалиден или пользователь удален, выполняет выход.
   *
   * @returns {Promise<boolean>} True если токен валиден
   */
  validateToken: async () => {
    if (!get().isAuthenticated) return false

    // Защита от одновременных вызовов
    const state = get()
    if (state.isLoading && state.user) {
      // Если уже идет загрузка и есть пользователь - не повторяем
      return true
    }

    try {
      const profile = await authApi.getProfile()
      set({
        user: profile.user,
        isLoading: false
      })
      return true
    } catch (error) {
      // Токен невалиден или пользователь удален - выходим
      console.warn('Token validation failed:', error.message)
      get().logout()
      return false
    }
  },

  /**
   * Принудительный выход с перенаправлением на логин
   * Используется когда обнаруживается, что пользователь не аутентифицирован
   */
  forceLogout: () => {
    console.warn('Force logout triggered')

    // Останавливаем периодическую проверку токена
    get().stopTokenValidation()

    // Очищаем состояние
    set({
      user: null,
      isAuthenticated: false,
      error: null
    })

    // Очищаем токены
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }

    // Перенаправление на логин с текущего пути
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?redirect=${redirectUrl}`
    }
  },

  /**
   * Периодическая проверка токена (каждые 5 минут)
   * Запускается автоматически при аутентификации
   */
  startTokenValidation: () => {
    if (get().tokenValidationInterval) {
      clearInterval(get().tokenValidationInterval)
    }

    const interval = setInterval(async () => {
      if (get().isAuthenticated) {
        const isValid = await get().validateToken()
        if (!isValid) {
          console.warn('Periodic token validation failed')
          get().forceLogout()
        }
      } else {
        clearInterval(interval)
      }
    }, 5 * 60 * 1000) // 5 минут

    set({ tokenValidationInterval: interval })
  },

  /**
   * Остановка периодической проверки токена
   */
  stopTokenValidation: () => {
    if (get().tokenValidationInterval) {
      clearInterval(get().tokenValidationInterval)
      set({ tokenValidationInterval: null })
    }
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

    const state = get()
    // Если уже загружается и есть пользователь - не повторяем запрос
    if (state.isLoading && state.user) {
      return { user: state.user }
    }

    // Если пользователь уже загружен - возвращаем его
    if (state.user) {
      return { user: state.user }
    }

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
