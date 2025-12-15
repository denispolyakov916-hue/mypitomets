/**
 * Компонент страницы входа
 * 
 * Форма аутентификации пользователя с:
 * - Полями email и пароля
 * - Валидацией формы
 * - Отображением ошибок
 * - Ссылкой на регистрацию
 * - Сохранением целевого URL для редиректа
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { ButtonLoader } from '../../components/Loader'

/**
 * Компонент страницы входа
 * 
 * Функции:
 * - Клиентская валидация
 * - Обработка серверных ошибок
 * - Редирект после успешного входа
 * - Ссылка на регистрацию
 */
function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError } = useAuthStore()
  
  // Состояние формы
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  
  // Очистка ошибок при монтировании
  useEffect(() => {
    clearError()
  }, [clearError])
  
  /**
   * Валидация полей формы
   * @returns {boolean} True если форма валидна
   */
  const validateForm = () => {
    const errors = {}
    
    if (!formData.email.trim()) {
      errors.email = 'Введите email'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Неверный формат email'
    }
    
    if (!formData.password) {
      errors.password = 'Введите пароль'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  /**
   * Обработчик изменения поля формы
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Очистка ошибки поля при изменении
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }))
    }
  }
  
  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const success = await login(formData.email, formData.password)
    
    if (success) {
      // Редирект на целевую страницу или список питомцев
      const from = location.state?.from?.pathname || '/pets'
      navigate(from, { replace: true })
    }
  }
  
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Вход в аккаунт
          </h1>
          <p className="text-gray-600">
            Войдите, чтобы управлять профилями питомцев
          </p>
        </div>
        
        {/* Карточка формы */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Серверная ошибка */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            {/* Поле Email */}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${validationErrors.email ? 'input-error' : ''}`}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={isLoading}
              />
              {validationErrors.email && (
                <p className="error-message">{validationErrors.email}</p>
              )}
            </div>
            
            {/* Поле пароля */}
            <div>
              <label htmlFor="password" className="label">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input ${validationErrors.password ? 'input-error' : ''}`}
                placeholder="Введите пароль"
                autoComplete="current-password"
                disabled={isLoading}
              />
              {validationErrors.password && (
                <p className="error-message">{validationErrors.password}</p>
              )}
            </div>
            
            {/* Кнопка отправки */}
            <button
              type="submit"
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ButtonLoader />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>
          
          {/* Ссылка на регистрацию */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Нет аккаунта?{' '}
            <Link 
              to="/register" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
