/**
 * Единое модальное окно для входа и регистрации
 *
 * Современный интерактивный дизайн с плавным переключением
 * между формами входа и регистрации.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { ButtonLoader } from '../../components/Loader'

/**
 * Компонент AuthModal
 *
 * Единое окно для аутентификации с плавным переключением
 * между формами входа и регистрации.
 */
function AuthModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, activateByCode, isLoading, error, clearError } = useAuthStore()

  // Определяем начальный режим по URL
  const isRegisterPath = location.pathname === '/register'
  const isLoginPath = location.pathname === '/login'

  // Состояние переключения форм
  const [isRegisterMode, setIsRegisterMode] = useState(isRegisterPath)
  const [isActive, setIsActive] = useState(isRegisterPath)

  // Состояние форм
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    passwordConfirm: ''
  })

  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  // Обновление режима при изменении пути
  useEffect(() => {
    const isRegisterPath = location.pathname === '/register'
    setIsRegisterMode(isRegisterPath)
    setIsActive(isRegisterPath)
  }, [location.pathname])

  // Очистка ошибок при монтировании или переключении режима
  useEffect(() => {
    clearError()
    setValidationErrors({})
  }, [clearError, isRegisterMode])

  /**
   * Переключение между режимами
   */
// Сделайте так:
const toggleMode = () => {
  // Сначала запускаем анимацию переключателя
  setIsActive(!isActive)
  
  // Через 1.8 секунды (после завершения анимации переключателя) 
  // меняем режим формы
  setTimeout(() => {
    setIsRegisterMode(!isRegisterMode)
  }, 800) // 1.8 секунды = время анимации переключателя
  
  setValidationErrors({})
  setRegistrationSuccess(false)
  setActivationCode('')
}

  /**
   * Валидация формы входа
   */
  const validateLoginForm = () => {
    const errors = {}

    if (!loginData.email.trim()) {
      errors.email = 'Введите email'
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = 'Неверный формат email'
    }

    if (!loginData.password) {
      errors.password = 'Введите пароль'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Валидация формы регистрации
   */
  const validateRegisterForm = () => {
    const errors = {}

    if (!registerData.email.trim()) {
      errors.email = 'Введите email'
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = 'Неверный формат email'
    }

    if (!registerData.password) {
      errors.password = 'Введите пароль'
    } else if (registerData.password.length < 6) {
      errors.password = 'Пароль должен быть не менее 6 символов'
    }

    if (!registerData.passwordConfirm) {
      errors.passwordConfirm = 'Подтвердите пароль'
    } else if (registerData.password !== registerData.passwordConfirm) {
      errors.passwordConfirm = 'Пароли не совпадают'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Обработчик изменения полей формы входа
   */
  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginData(prev => ({ ...prev, [name]: value }))

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  /**
   * Обработчик изменения полей формы регистрации
   */
  const handleRegisterChange = (e) => {
    const { name, value } = e.target
    setRegisterData(prev => ({ ...prev, [name]: value }))

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  /**
   * Обработчик отправки формы входа
   */
  const handleLoginSubmit = async (e) => {
    e.preventDefault()

    if (!validateLoginForm()) return

    const success = await login(loginData.email, loginData.password)

    if (success) {
      const from = location.state?.from?.pathname || '/pets'
      navigate(from, { replace: true })
    }
  }

  /**
   * Обработчик отправки формы регистрации
   */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()

    if (!validateRegisterForm()) return

    try {
      await register(
        registerData.email,
        registerData.password,
        registerData.passwordConfirm
      )

      setRegistrationSuccess(true)
    } catch (error) {
      // Ошибка уже обработана в store
    }
  }

  /**
   * Обработчик активации аккаунта
   */
  const handleActivation = async (e) => {
    e.preventDefault()

    if (activationCode.length !== 6) {
      setValidationErrors({ activationCode: 'Код должен содержать 6 цифр' })
      return
    }

    const success = await activateByCode(activationCode)

    if (success) {
      navigate('/pets', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4">
      <div className={`auth-container ${isActive ? 'auth-active' : ''}`}>
        {/* Форма входа */}
        <div className={`auth-form-box ${isRegisterMode ? 'auth-register' : 'auth-login'}`}>
          {!registrationSuccess ? (
            <form onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit} className="auth-form">
              <h1>{isRegisterMode ? 'Регистрация' : 'Вход'}</h1>

              {/* Серверная ошибка */}
              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              {/* Поле Email */}
              <div className="auth-input-box">
                <input
                  type="email"
                  name="email"
                  value={isRegisterMode ? registerData.email : loginData.email}
                  onChange={isRegisterMode ? handleRegisterChange : handleLoginChange}
                  placeholder="Email"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
                <i className='bx bxs-envelope'></i>
                {validationErrors.email && (
                  <div className="auth-field-error">{validationErrors.email}</div>
                )}
              </div>

              {/* Поле пароля */}
              <div className="auth-input-box">
                <input
                  type="password"
                  name="password"
                  value={isRegisterMode ? registerData.password : loginData.password}
                  onChange={isRegisterMode ? handleRegisterChange : handleLoginChange}
                  placeholder="Пароль"
                  required
                  disabled={isLoading}
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                />
                <i className='bx bxs-lock-alt'></i>
                {validationErrors.password && (
                  <div className="auth-field-error">{validationErrors.password}</div>
                )}
              </div>

              {/* Поле подтверждения пароля (только для регистрации) */}
              {isRegisterMode && (
                <div className="auth-input-box">
                  <input
                    type="password"
                    name="passwordConfirm"
                    value={registerData.passwordConfirm}
                    onChange={handleRegisterChange}
                    placeholder="Подтвердите пароль"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <i className='bx bxs-lock-alt'></i>
                  {validationErrors.passwordConfirm && (
                    <div className="auth-field-error">{validationErrors.passwordConfirm}</div>
                  )}
                </div>
              )}

              {/* Кнопка отправки */}
              <button
                type="submit"
                className="auth-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="auth-btn-content">
                    <ButtonLoader />
                    <span>{isRegisterMode ? 'Регистрация...' : 'Вход...'}</span>
                  </div>
                ) : (
                  isRegisterMode ? 'Зарегистрироваться' : 'Войти'
                )}
              </button>

              {/* Социальные сети */}
              <div className="auth-social-text">
                или {isRegisterMode ? 'зарегистрируйтесь' : 'войдите'} через
              </div>
              <div className="auth-social-icons">
                <a href="#" className="auth-social-icon" title="ВКонтакте">
                  <i className='bx bxl-vk'></i>
                </a>
                <a href="#" className="auth-social-icon" title="Яндекс">
                  <span className="social-text-icon">Я</span>
                </a>
                <a href="#" className="auth-social-icon" title="Telegram">
                  <i className='bx bxl-telegram'></i>
                </a>
              </div>
            </form>
          ) : (
            /* Форма активации */
            <form onSubmit={handleActivation} className="auth-form">
              <h1>Подтвердите email</h1>

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <div className="auth-info-box">
                Код активации отправлен на <strong>{registerData.email}</strong>
              </div>

              <div className="auth-input-box">
                <input
                  type="text"
                  name="activationCode"
                  value={activationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setActivationCode(value)
                    setValidationErrors({})
                  }}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                  className="auth-activation-input"
                />
                <i className='bx bxs-key'></i>
                {validationErrors.activationCode && (
                  <div className="auth-field-error">{validationErrors.activationCode}</div>
                )}
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={isLoading || activationCode.length !== 6}
              >
                {isLoading ? 'Активация...' : 'Активировать'}
              </button>

              <button
                type="button"
                onClick={() => setRegistrationSuccess(false)}
                className="auth-back-link"
              >
                Назад к регистрации
              </button>
            </form>
          )}
        </div>

        {/* Панель переключения */}
        <div className="auth-toggle-box">
          <div className={`auth-toggle-panel auth-toggle-left ${isRegisterMode ? 'auth-hidden' : ''}`}>
            <h1>Добро пожаловать!</h1>
            <p>У вас нет аккаунта?</p>
            <button className="auth-toggle-btn" onClick={toggleMode}>
              Зарегистрироваться
            </button>
          </div>

          <div className={`auth-toggle-panel auth-toggle-right ${!isRegisterMode ? 'auth-hidden' : ''}`}>
            <h1>Рады видеть вас снова!</h1>
            <p>У вас уже есть аккаунт?</p>
            <button className="auth-toggle-btn" onClick={toggleMode}>
              Войти
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default AuthModal
