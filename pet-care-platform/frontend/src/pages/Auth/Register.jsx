/**
 * Компонент страницы регистрации
 * 
 * Форма регистрации нового пользователя с:
 * - Email, паролем, подтверждением пароля
 * - Клиентской валидацией
 * - Обработкой серверных ошибок
 * - Формой активации после регистрации
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { ButtonLoader } from '../../components/Loader'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Компонент страницы регистрации
 * 
 * Функции:
 * - Валидация формы (формат email, длина пароля, совпадение паролей)
 * - Обратная связь по валидации в реальном времени
 * - Отображение серверных ошибок
 * - Форма активации после успешной регистрации
 */
function Register() {
  const navigate = useNavigate()
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)
  const { register, activateByCode, resendActivationCode, clearError } = useAuthStore()
  
  // Состояние формы регистрации
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    passwordConfirm: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  
  // Состояние для таймера повторной отправки кода
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState(false)
  
  // Очистка ошибок при монтировании
  useEffect(() => {
    clearError()
  }, [clearError])
  
  // Таймер обратного отсчёта для повторной отправки кода
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])
  
  /**
   * Обработчик повторной отправки кода активации
   */
  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    
    setResendSuccess(false)
    const success = await resendActivationCode(formData.email)
    
    if (success) {
      setResendCooldown(60) // 60 секунд ожидания
      setResendSuccess(true)
      // Очищаем сообщение об успехе через 5 секунд
      setTimeout(() => setResendSuccess(false), 5000)
    }
  }
  
  /**
   * Вычисление силы пароля
   * @param {string} password - Пароль для проверки
   * @returns {Object} Объект с уровнем силы и сообщением
   */
  const calculatePasswordStrength = (password) => {
    if (!password) {
      return { level: 0, message: '', color: 'gray' }
    }
    
    let score = 0
    const checks = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Zа-яА-ЯёЁ]/.test(password),
      hasDigit: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
      isLong: password.length >= 12
    }
    
    if (checks.length) score += 1
    if (checks.hasLetter) score += 1
    if (checks.hasDigit) score += 1
    if (checks.hasSpecial) score += 1
    if (checks.isLong) score += 1
    
    // Определение уровня и сообщения
    if (score <= 2) {
      return { level: 1, message: 'Слабый', color: 'red', checks }
    } else if (score <= 3) {
      return { level: 2, message: 'Средний', color: 'yellow', checks }
    } else if (score <= 4) {
      return { level: 3, message: 'Хороший', color: 'blue', checks }
    } else {
      return { level: 4, message: 'Отличный', color: 'green', checks }
    }
  }
  
  // Вычисление силы пароля
  const passwordStrength = calculatePasswordStrength(formData.password)
  
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

    // Валидация имени (опционально, но если заполнено - проверяем длину)
    if (formData.firstName && formData.firstName.length < 2) {
      errors.firstName = 'Имя должно содержать минимум 2 символа'
    }

    // Валидация фамилии (опционально, но если заполнено - проверяем длину)
    if (formData.lastName && formData.lastName.length < 2) {
      errors.lastName = 'Фамилия должна содержать минимум 2 символа'
    }

    // Валидация пароля с новыми требованиями
    if (!formData.password) {
      errors.password = 'Введите пароль'
    } else {
      const pwdErrors = []
      if (formData.password.length < 8) {
        pwdErrors.push('минимум 8 символов')
      }
      if (!/[a-zA-Zа-яА-ЯёЁ]/.test(formData.password)) {
        pwdErrors.push('хотя бы одну букву')
      }
      if (!/\d/.test(formData.password)) {
        pwdErrors.push('хотя бы одну цифру')
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formData.password)) {
        pwdErrors.push('хотя бы один спецсимвол')
      }
      if (pwdErrors.length > 0) {
        errors.password = `Пароль должен содержать: ${pwdErrors.join(', ')}`
      }
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
   * Обработчик отправки формы регистрации
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      const response = await register(
        formData.email,
        formData.password,
        formData.passwordConfirm,
        formData.firstName,
        formData.lastName
      )
      
      // Регистрация успешна - показываем форму активации
      setRegistrationSuccess(true)
    } catch (error) {
      // Ошибка уже обработана в store
    }
  }
  
  /**
   * Обработчик активации
   */
  const handleActivation = async (e) => {
    e.preventDefault()
    
    if (activationCode.length !== 6) {
      setValidationErrors({ activationCode: 'Код должен содержать 6 цифр' })
      return
    }
    
    const success = await activateByCode(activationCode)
    
    if (success) {
      navigate('/pet-id', { replace: true })
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 px-4 py-8">
      {/* Animated background elements - same as Home page */}
      <div className="absolute inset-0">
        {/* Primary gradient orbs */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-accent-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary-300/5 to-accent-300/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Additional decorative orbs */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-32 h-32 bg-accent-300/8 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-primary-300/6 rounded-full blur-2xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
        />
      </div>

      {/* Animated wave background - same as Home page */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute left-0 right-0"
          style={{ top: '15%' }}
          animate={{
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg width="100%" height="200" viewBox="0 0 1920 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <motion.path
              d="M0,100 Q320,60 640,100 T1280,100 Q1600,60 1920,100"
              stroke="url(#register-gradient-purple)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animate={{
                opacity: [0.1, 0.25, 0.1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <defs>
              <linearGradient id="register-gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d9bfff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#d9bfff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#d9bfff" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        <motion.div
          className="absolute left-0 right-0"
          style={{ top: '70%' }}
          animate={{
            y: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
        >
          <svg width="100%" height="150" viewBox="0 0 1920 150" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <motion.path
              d="M0,75 Q320,45 640,75 T1280,75 Q1600,45 1920,75"
              stroke="url(#register-gradient-orange)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              animate={{
                opacity: [0.08, 0.2, 0.08],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
            />
            <defs>
              <linearGradient id="register-gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F0EB93" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#F0EB93" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#F0EB93" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* Floating decorative dots - same style as Home page */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`dot-register-${i}`}
            className={`absolute w-2 h-2 rounded-full ${
              i % 4 === 0 ? 'bg-primary-200' : i % 4 === 1 ? 'bg-accent-200' : i % 4 === 2 ? 'bg-primary-100' : 'bg-white/20'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -35, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Заголовок */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center gap-3 mb-6"
            whileHover={{ scale: 1.05 }}
          >
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-3 rounded-2xl shadow-lg shadow-primary-500/30">
              <span className="text-3xl">🐾</span>
            </div>
            <span className="text-3xl bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent font-bold">
              Питомец+
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent mb-4">
            {registrationSuccess ? 'Подтвердите email' : 'Создать аккаунт'}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {registrationSuccess
              ? 'Введите код активации из письма'
              : 'Зарегистрируйтесь, чтобы начать использовать Питомец+'
            }
          </p>
        </motion.div>
        
        {/* Карточка формы - same glassmorphism style as Home page */}
        <motion.div
          className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring", stiffness: 100 }}
          whileHover={{ scale: 1.02 }}
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>

          {/* Subtle animated border */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
              backgroundSize: '200% 200%',
            }}
            animate={{
              backgroundPosition: ['0% 0%', '200% 200%'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          {!registrationSuccess ? (
            // Форма регистрации
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Серверная ошибка */}
              {error && (
                <motion.div
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}
              
              {/* Поле Email */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <label htmlFor="email" className="block text-sm font-semibold text-white/90 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                    validationErrors.email ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-accent-400/60'
                  }`}
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <motion.p
                    className="text-sm text-red-600 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {validationErrors.email}
                  </motion.p>
                )}
              </motion.div>

              {/* Поле имени */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <label htmlFor="firstName" className="block text-sm font-semibold text-white/90 mb-2">
                  Имя <span className="text-white/60">(опционально)</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                    validationErrors.firstName ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-accent-400/60'
                  }`}
                  placeholder="Ваше имя"
                  autoComplete="given-name"
                  disabled={isLoading}
                />
                {validationErrors.firstName && (
                  <motion.p
                    className="text-sm text-red-600 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {validationErrors.firstName}
                  </motion.p>
                )}
              </motion.div>

              {/* Поле фамилии */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.55 }}
              >
                <label htmlFor="lastName" className="block text-sm font-semibold text-white/90 mb-2">
                  Фамилия <span className="text-white/60">(опционально)</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                    validationErrors.lastName ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-accent-400/60'
                  }`}
                  placeholder="Ваша фамилия"
                  autoComplete="family-name"
                  disabled={isLoading}
                />
                {validationErrors.lastName && (
                  <motion.p
                    className="text-sm text-red-600 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {validationErrors.lastName}
                  </motion.p>
                )}
              </motion.div>

              {/* Поле пароля */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                      validationErrors.password ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-accent-400/60'
                    }`}
                    placeholder="Минимум 8 символов"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-accent-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {/* Индикатор силы пароля */}
                {formData.password && (
                  <motion.div
                    className="mt-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Шкала силы */}
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength.level >= level
                              ? passwordStrength.color === 'red' ? 'bg-red-500'
                                : passwordStrength.color === 'yellow' ? 'bg-yellow-500'
                                : passwordStrength.color === 'blue' ? 'bg-blue-500'
                                : 'bg-green-500'
                              : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Статус и подсказки */}
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-medium ${
                        passwordStrength.color === 'red' ? 'text-red-400'
                          : passwordStrength.color === 'yellow' ? 'text-yellow-400'
                          : passwordStrength.color === 'blue' ? 'text-blue-400'
                          : 'text-green-400'
                      }`}>
                        {passwordStrength.message}
                      </span>
                      
                      <div className="flex gap-2 text-xs">
                        <span className={passwordStrength.checks?.length ? 'text-green-400' : 'text-white/40'}>
                          8+
                        </span>
                        <span className={passwordStrength.checks?.hasLetter ? 'text-green-400' : 'text-white/40'}>
                          Aa
                        </span>
                        <span className={passwordStrength.checks?.hasDigit ? 'text-green-400' : 'text-white/40'}>
                          123
                        </span>
                        <span className={passwordStrength.checks?.hasSpecial ? 'text-green-400' : 'text-white/40'}>
                          @#$
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {validationErrors.password && (
                  <motion.p
                    className="text-sm text-red-600 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {validationErrors.password}
                  </motion.p>
                )}
              </motion.div>

              {/* Поле подтверждения пароля */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <label htmlFor="passwordConfirm" className="block text-sm font-semibold text-white/90 mb-2">
                  Подтвердите пароль
                </label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    id="passwordConfirm"
                    name="passwordConfirm"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                      validationErrors.passwordConfirm ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-accent-400/60'
                    }`}
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-accent-300 transition-colors"
                  >
                    {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {validationErrors.passwordConfirm && (
                  <motion.p
                    className="text-sm text-red-600 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {validationErrors.passwordConfirm}
                  </motion.p>
                )}
              </motion.div>
              
              {/* Кнопка отправки - same style as Home page CTA */}
              <motion.button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold py-4 px-8 rounded-2xl hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                {/* Button shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />

                {isLoading ? (
                  <>
                    <ButtonLoader />
                    <span>Регистрация...</span>
                  </>
                ) : (
                  <span>Зарегистрироваться</span>
                )}
              </motion.button>
            </form>
          ) : (
            // Форма активации
            <form onSubmit={handleActivation} className="space-y-6">
              {error && (
                <motion.div
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                className="p-5 bg-gradient-to-r from-blue-50 to-primary-50 border border-blue-200 rounded-xl text-sm text-blue-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                Код активации отправлен на <strong>{formData.email}</strong>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label htmlFor="activationCode" className="block text-sm font-semibold text-white/90 mb-2">
                  Код активации
                </label>
                <input
                  type="text"
                  id="activationCode"
                  name="activationCode"
                  value={activationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setActivationCode(value)
                    setValidationErrors({})
                  }}
                  className={`w-full px-4 py-4 border-2 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                    validationErrors.activationCode ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-accent-400/60'
                  }`}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                />
                {validationErrors.activationCode && (
                  <motion.p
                    className="text-sm text-red-600 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {validationErrors.activationCode}
                  </motion.p>
                )}
              </motion.div>

              <motion.button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold py-4 px-8 rounded-2xl hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                disabled={isLoading || activationCode.length !== 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                {/* Button shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />

                {isLoading ? 'Активация...' : 'Активировать'}
              </motion.button>

              {/* Кнопка повторной отправки кода */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                {resendSuccess && (
                  <motion.p 
                    className="text-green-400 text-sm mb-3"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ✓ Новый код отправлен на email
                  </motion.p>
                )}
                
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`text-sm font-semibold transition-all duration-200 relative group ${
                    resendCooldown > 0 
                      ? 'text-white/50 cursor-not-allowed' 
                      : 'text-white/80 hover:text-accent-300'
                  }`}
                >
                  {resendCooldown > 0 
                    ? `Отправить повторно через ${resendCooldown} сек` 
                    : 'Отправить код повторно'
                  }
                  {resendCooldown === 0 && (
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-400 group-hover:w-full transition-all duration-300"></span>
                  )}
                </button>
              </motion.div>
              
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <button
                  type="button"
                  onClick={() => setRegistrationSuccess(false)}
                  className="text-white/80 hover:text-accent-300 font-semibold transition-all duration-200 relative group"
                >
                  Назад к регистрации
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-400 group-hover:w-full transition-all duration-300"></span>
                </button>
              </motion.div>
            </form>
          )}

          {/* Ссылка на вход */}
          <motion.div
            className="mt-8 text-center relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <span className="text-white/80">Уже есть аккаунт? </span>
            <Link
              to="/login"
              className="text-white font-semibold hover:text-accent-300 transition-all duration-200 relative group"
            >
              Войти
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </motion.div>

          <div className="relative z-10"></div>
        </div>
      </div>
    </div>
  )
}

export default Register
