/**
 * Модуль API аутентификации
 * 
 * Предоставляет функции для аутентификации пользователей:
 * - Регистрация
 * - Вход
 * - Обновление токена
 * - Получение профиля
 * 
 * Все функции возвращают промисы и управляют хранением токенов.
 */

import api from './client'

/**
 * Регистрация нового аккаунта
 *
 * Теперь НЕ возвращает токены - требуется активация email.
 *
 * @param {string} email - Email адрес пользователя
 * @param {string} password - Пароль (минимум 6 символов)
 * @param {string} passwordConfirm - Подтверждение пароля
 * @param {string} firstName - Имя пользователя (опционально)
 * @param {string} lastName - Фамилия пользователя (опционально)
 * @returns {Promise<Object>} Сообщение об успешной регистрации
 * @throws {Object} Ошибка с сообщением и ошибками валидации
 *
 * @example
 *   const response = await register('user@example.com', 'secret123', 'secret123', 'Иван', 'Иванов')
 */
export const register = async (email, password, passwordConfirm, firstName = '', lastName = '') => {
  const response = await api.post('/auth/registration/', {
    email,
    password,
    password_confirm: passwordConfirm,
    first_name: firstName,
    last_name: lastName
  })
  
  // Токены больше НЕ возвращаются при регистрации
  // Пользователь должен сначала активировать аккаунт
  return response
}

/**
 * Вход по email и паролю
 * 
 * Аутентифицирует пользователя и возвращает JWT токены.
 * Теперь проверяет, что аккаунт активирован.
 * 
 * @param {string} email - Email адрес пользователя
 * @param {string} password - Пароль пользователя
 * @returns {Promise<Object>} Данные пользователя и токены
 * @throws {Object} Ошибка с сообщением (может быть "Аккаунт не активирован")
 * 
 * @example
 *   const { user, accessToken, refreshToken } = await login('user@example.com', 'secret123')
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login/', {
    email,
    password
  }, {
    withCredentials: true // Важно для получения cookie с refresh токеном
  })
  
  // Сохраняем токены при успешном входе
  if (response.accessToken && response.refreshToken) {
    localStorage.setItem('access_token', response.accessToken)
    localStorage.setItem('refresh_token', response.refreshToken)
  }
  
  return response
}

/**
 * Выход пользователя
 * 
 * Очищает сохранённые токены и делает API запрос для удаления refresh токена из БД.
 * 
 * @returns {Promise<Object>} Результат операции выхода
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout/', {}, {
      withCredentials: true // Важно для отправки cookie с refresh токеном
    })
  } catch (error) {
    // Игнорируем ошибки при выходе
    console.error('Ошибка при выходе:', error)
  } finally {
    // Очищаем токены в любом случае
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

/**
 * Получение профиля текущего пользователя
 * 
 * Возвращает полный профиль включая питомцев, заказы и курсы.
 * Требует валидный JWT токен.
 * 
 * @returns {Promise<Object>} Данные профиля с пользователем, питомцами, заказами, курсами
 * @throws {Object} Ошибка если не аутентифицирован
 */
export const getProfile = async () => {
  return await api.get('/users/profile/')
}

/**
 * Обновление профиля пользователя
 *
 * @param {Object} profileData - Данные для обновления профиля
 * @returns {Promise<Object>} Обновлённые данные профиля
 */
export const updateProfile = async (profileData) => {
  return await api.put('/users/profile/', profileData)
}

/**
 * Обновление access токена используя refresh токен из cookie
 * 
 * Вызывается автоматически интерцептором при 401 ошибках.
 * Refresh токен берётся из cookie (httpOnly).
 * 
 * @returns {Promise<Object>} Новый access токен
 * @throws {Object} Ошибка если refresh токен невалиден
 */
export const refreshToken = async () => {
  const response = await api.get('/auth/refresh/', {
    withCredentials: true // Важно для отправки cookie с refresh токеном
  })
  
  if (response.accessToken) {
    localStorage.setItem('access_token', response.accessToken)
  }
  if (response.refreshToken) {
    localStorage.setItem('refresh_token', response.refreshToken)
  }
  
  return response
}

/**
 * Активация аккаунта по коду из email
 * 
 * @param {string} activationCode - 6-значный код активации
 * @returns {Promise<Object>} Токены и данные пользователя
 * @throws {Object} Ошибка если код невалиден
 * 
 * @example
 *   const { user, accessToken, refreshToken } = await activateByCode('123456')
 */
export const activateByCode = async (activationCode) => {
  const response = await api.post('/auth/activate-by-code/', {
    activation_code: activationCode
  })
  
  // Сохраняем токены после успешной активации
  if (response.accessToken && response.refreshToken) {
    localStorage.setItem('access_token', response.accessToken)
    localStorage.setItem('refresh_token', response.refreshToken)
  }
  
  return response
}

/**
 * Обмен временного кода на токены (после активации по ссылке)
 * 
 * @param {string} authCode - Временный код из URL параметра
 * @returns {Promise<Object>} Токены и данные пользователя
 * @throws {Object} Ошибка если код невалиден
 * 
 * @example
 *   const { user, accessToken, refreshToken } = await exchangeAuthCode('abc123')
 */
export const exchangeAuthCode = async (authCode) => {
  const response = await api.post('/auth/exchange-auth-code/', {
    auth_code: authCode
  })
  
  // Сохраняем токены
  if (response.accessToken && response.refreshToken) {
    localStorage.setItem('access_token', response.accessToken)
    localStorage.setItem('refresh_token', response.refreshToken)
  }
  
  return response
}

/**
 * Проверка наличия валидного токена
 * 
 * Простая проверка - не верифицирует токен на сервере.
 * 
 * @returns {boolean} True если access токен существует
 */
export const hasToken = () => {
  return !!localStorage.getItem('access_token')
}
