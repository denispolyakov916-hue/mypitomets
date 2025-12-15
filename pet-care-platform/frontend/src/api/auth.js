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
 * Создаёт нового пользователя и возвращает токены для немедленного входа.
 * 
 * @param {string} email - Email адрес пользователя
 * @param {string} password - Пароль (минимум 6 символов)
 * @param {string} passwordConfirm - Подтверждение пароля
 * @returns {Promise<Object>} Данные пользователя и токены
 * @throws {Object} Ошибка с сообщением и ошибками валидации
 * 
 * @example
 *   const { user, tokens } = await register('user@example.com', 'secret123', 'secret123')
 */
export const register = async (email, password, passwordConfirm) => {
  const response = await api.post('/auth/register/', {
    email,
    password,
    password_confirm: passwordConfirm
  })
  
  // Сохраняем токены при успешной регистрации
  if (response.tokens) {
    localStorage.setItem('access_token', response.tokens.access)
    localStorage.setItem('refresh_token', response.tokens.refresh)
  }
  
  return response
}

/**
 * Вход по email и паролю
 * 
 * Аутентифицирует пользователя и возвращает JWT токены.
 * 
 * @param {string} email - Email адрес пользователя
 * @param {string} password - Пароль пользователя
 * @returns {Promise<Object>} Данные пользователя и токены
 * @throws {Object} Ошибка с сообщением
 * 
 * @example
 *   const { user, tokens } = await login('user@example.com', 'secret123')
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login/', {
    email,
    password
  })
  
  // Сохраняем токены при успешном входе
  if (response.tokens) {
    localStorage.setItem('access_token', response.tokens.access)
    localStorage.setItem('refresh_token', response.tokens.refresh)
  }
  
  return response
}

/**
 * Выход пользователя
 * 
 * Очищает сохранённые токены из localStorage.
 * Не делает API запрос (JWT токены stateless).
 */
export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
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
 * Обновление access токена используя refresh токен
 * 
 * Вызывается автоматически интерцептором при 401 ошибках.
 * 
 * @returns {Promise<Object>} Новый access токен
 * @throws {Object} Ошибка если refresh токен невалиден
 */
export const refreshToken = async () => {
  const refresh = localStorage.getItem('refresh_token')
  
  if (!refresh) {
    throw new Error('Refresh токен отсутствует')
  }
  
  const response = await api.post('/auth/token/refresh/', {
    refresh
  })
  
  if (response.access) {
    localStorage.setItem('access_token', response.access)
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
