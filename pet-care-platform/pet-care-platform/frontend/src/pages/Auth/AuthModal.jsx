/**
 * Единое модальное окно для входа и регистрации
 *
 * Современный интерактивный дизайн с плавным переключением
 * между формами входа и регистрации.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import PhoneAuthForm from './PhoneAuthForm'
import { resolvePostAuthRedirect } from '../../utils/postAuthRedirect'
import { ButtonLoader } from '../../components/Loader'
import '../../styles/auth.css'

/**
 * Компонент AuthModal
 *
 * Единое окно для аутентификации с плавным переключением
 * между формами входа и регистрации.
 */
function AuthModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)
  const { login, register, activateByCode, clearError } = useAuthStore()
  const [authMethod, setAuthMethod] = useState('email') // 'email' | 'phone'

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
      errors.email = 'Введите адрес электронной почты'
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = 'Введите корректный адрес электронной почты (например: example@mail.com)'
    }

    if (!loginData.password) {
      errors.password = 'Введите пароль для входа в систему'
    } else if (loginData.password.length < 1) {
      errors.password = 'Пароль не может быть пустым'
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
      errors.email = 'Введите адрес электронной почты'
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = 'Введите корректный адрес электронной почты (например: example@mail.com)'
    }

    if (!registerData.password) {
      errors.password = 'Введите пароль для защиты вашего аккаунта'
    } else if (registerData.password.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов. Используйте буквы, цифры и специальные символы для безопасности'
    } else if (registerData.password.length > 128) {
      errors.password = 'Пароль не должен превышать 128 символов'
    }

    if (!registerData.passwordConfirm) {
      errors.passwordConfirm = 'Повторите ввод пароля для подтверждения'
    } else if (registerData.password !== registerData.passwordConfirm) {
      errors.passwordConfirm = 'Пароли не совпадают. Убедитесь, что ввели одинаковый пароль в обоих полях'
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
      navigate(resolvePostAuthRedirect({ location }), { replace: true })
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
      navigate(resolvePostAuthRedirect({ location }), { replace: true })
    }
  }

  const methodTabs = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: '6px 0 2px' }}>
      {['email', 'phone'].map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => { setAuthMethod(m); clearError() }}
          style={{
            padding: '9px 0',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            background: authMethod === m ? '#fbba2d' : 'rgba(82,47,129,0.08)',
            color: authMethod === m ? '#3e2362' : '#7c6f93',
            transition: 'all .2s',
          }}
        >
          {m === 'email' ? 'Email' : 'Телефон'}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4">
      <div className={`auth-container ${isActive ? 'auth-active' : ''}`}>
        {/* Форма входа */}
        <div className={`auth-form-box ${isRegisterMode ? 'auth-register' : 'auth-login'}`}>
          {!registrationSuccess ? (
            isRegisterMode && authMethod === 'phone' ? (
              <div className="auth-form">
                <h1>Регистрация</h1>
                {methodTabs}
                <PhoneAuthForm />
              </div>
            ) : (
            <form onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit} className="auth-form">
              <h1>{isRegisterMode ? 'Регистрация' : 'Вход'}</h1>
              {isRegisterMode && methodTabs}

              {/* Серверная ошибка */}
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              {/* Поле Email */}
              <div className="auth-input-box">
                <label htmlFor="auth-email" className="sr-only">Email</label>
                <input
                  type="email"
                  name="email"
                  id="auth-email"
                  value={isRegisterMode ? registerData.email : loginData.email}
                  onChange={isRegisterMode ? handleRegisterChange : handleLoginChange}
                  placeholder="Email"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  aria-invalid={Boolean(validationErrors.email)}
                  aria-describedby={validationErrors.email ? 'auth-email-error' : undefined}
                />
                <i className='bx bxs-envelope'></i>
                {validationErrors.email && (
                  <div className="auth-field-error" id="auth-email-error" role="alert">{validationErrors.email}</div>
                )}
              </div>

              {/* Поле пароля */}
              <div className="auth-input-box">
                <label htmlFor="auth-password" className="sr-only">Пароль</label>
                <input
                  type="password"
                  name="password"
                  id="auth-password"
                  value={isRegisterMode ? registerData.password : loginData.password}
                  onChange={isRegisterMode ? handleRegisterChange : handleLoginChange}
                  placeholder="Пароль"
                  required
                  disabled={isLoading}
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  aria-invalid={Boolean(validationErrors.password)}
                  aria-describedby={validationErrors.password ? 'auth-password-error' : undefined}
                />
                <i className='bx bxs-lock-alt'></i>
                {validationErrors.password && (
                  <div className="auth-field-error" id="auth-password-error" role="alert">{validationErrors.password}</div>
                )}
              </div>

              {/* Поле подтверждения пароля (только для регистрации) */}
              {isRegisterMode && (
                <div className="auth-input-box">
                  <label htmlFor="auth-password-confirm" className="sr-only">Подтверждение пароля</label>
                  <input
                    type="password"
                    name="passwordConfirm"
                    id="auth-password-confirm"
                    value={registerData.passwordConfirm}
                    onChange={handleRegisterChange}
                    placeholder="Подтвердите пароль"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    aria-invalid={Boolean(validationErrors.passwordConfirm)}
                    aria-describedby={validationErrors.passwordConfirm ? 'auth-password-confirm-error' : undefined}
                  />
                  <i className='bx bxs-lock-alt'></i>
                  {validationErrors.passwordConfirm && (
                    <div className="auth-field-error" id="auth-password-confirm-error" role="alert">
                      {validationErrors.passwordConfirm}
                    </div>
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

              {/* Ссылка восстановления пароля (только для входа) */}
              {!isRegisterMode && (
                <Link 
                  to="/forgot-password" 
                  className="auth-forgot-link"
                  style={{ 
                    display: 'block', 
                    textAlign: 'center', 
                    marginTop: '12px',
                    color: '#522f81',
                    fontSize: '14px',
                    textDecoration: 'none'
                  }}
                >
                  Забыли пароль?
                </Link>
              )}

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
            )
          ) : (
            /* Форма активации */
            <form onSubmit={handleActivation} className="auth-form">
              <h1>Подтвердите email</h1>

              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <div className="auth-info-box">
                Код активации отправлен на <strong>{registerData.email}</strong>
              </div>

              <div className="auth-input-box">
                <label htmlFor="auth-activation-code" className="sr-only">Код активации</label>
                <input
                  type="text"
                  name="activationCode"
                  id="auth-activation-code"
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
                  aria-invalid={Boolean(validationErrors.activationCode)}
                  aria-describedby={validationErrors.activationCode ? 'auth-activation-code-error' : undefined}
                />
                <i className='bx bxs-key'></i>
                {validationErrors.activationCode && (
                  <div className="auth-field-error" id="auth-activation-code-error" role="alert">
                    {validationErrors.activationCode}
                  </div>
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
