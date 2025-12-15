/**
 * Компонент страницы регистрации
 * 
 * Форма регистрации нового пользователя с:
 * - Email, паролем, подтверждением пароля
 * - Клиентской валидацией
 * - Обработкой серверных ошибок
 * - Автоматическим входом после регистрации
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { ButtonLoader } from '../../components/Loader'

/**
 * Компонент страницы регистрации
 * 
 * Функции:
 * - Валидация формы (формат email, длина пароля, совпадение паролей)
 * - Обратная связь по валидации в реальном времени
 * - Отображение серверных ошибок
 * - Редирект на страницу питомцев после успешной регистрации
 */
function Register() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()
  
  // Состояние формы
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: ''
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
    
    // Валидация email
    if (!formData.email.trim()) {
      errors.email = 'Введите email'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Неверный формат email'
    }
    
    // Валидация пароля
    if (!formData.password) {
      errors.password = 'Введите пароль'
    } else if (formData.password.length < 6) {
      errors.password = 'Пароль должен быть не менее 6 символов'
    }
    
    // Валидация подтверждения пароля
    if (!formData.passwordConfirm) {
      errors.passwordConfirm = 'Подтвердите пароль'
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'Пароли не совпадают'
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
    
    const success = await register(
      formData.email, 
      formData.password, 
      formData.passwordConfirm
    )
    
    if (success) {
      // Редирект на страницу питомцев после успешной регистрации
      navigate('/pets', { replace: true })
    }
  }
  
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Создать аккаунт
          </h1>
          <p className="text-gray-600">
            Зарегистрируйтесь, чтобы начать использовать Питомец+
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
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
                disabled={isLoading}
              />
              {validationErrors.password && (
                <p className="error-message">{validationErrors.password}</p>
              )}
            </div>
            
            {/* Поле подтверждения пароля */}
            <div>
              <label htmlFor="passwordConfirm" className="label">
                Подтвердите пароль
              </label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className={`input ${validationErrors.passwordConfirm ? 'input-error' : ''}`}
                placeholder="Повторите пароль"
                autoComplete="new-password"
                disabled={isLoading}
              />
              {validationErrors.passwordConfirm && (
                <p className="error-message">{validationErrors.passwordConfirm}</p>
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
                  Регистрация...
                </>
              ) : (
                'Зарегистрироваться'
              )}
            </button>
          </form>
          
          {/* Ссылка на вход */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link 
              to="/login" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
