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
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { ButtonLoader } from '../../components/Loader'
import { Eye, EyeOff } from 'lucide-react'

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
  const { login, isLoading, error, clearError, user } = useAuthStore()
  
  // Состояние формы
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  
  // Очистка ошибок при монтировании
  useEffect(() => {
    clearError()
  }, [clearError])
  
  // Редирект после успешного логина
  useEffect(() => {
    if (user && !isLoading) {
      // Редирект на целевую страницу или в зависимости от роли
      let redirectPath = location.state?.from?.pathname || 
                         new URLSearchParams(location.search).get('redirect')
      
      if (!redirectPath) {
        if (user.role === 'course_creator') {
          redirectPath = '/admin-panel/courses'
        } else if (user.is_staff || user.is_superuser) {
          redirectPath = '/admin-panel/dashboard'
        } else {
          redirectPath = '/pet-id'
        }
      }
      
      navigate(redirectPath, { replace: true })
    }
  }, [user, isLoading, navigate, location])
  
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
    
    await login(formData.email, formData.password)
    // Редирект будет выполнен в useEffect при обновлении user
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600 px-4">
      {/* Animated background elements - same as Home page */}
      <div className="absolute inset-0">
        {/* Primary gradient orbs */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl"
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
          className="absolute bottom-20 right-20 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"
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
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-300/5 to-orange-300/5 rounded-full blur-3xl"
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
          className="absolute top-1/4 right-1/4 w-32 h-32 bg-orange-300/8 rounded-full blur-2xl"
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
          className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-purple-300/6 rounded-full blur-2xl"
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
              stroke="url(#auth-gradient-purple)"
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
              <linearGradient id="auth-gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#d8b4fe" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0.8" />
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
              stroke="url(#auth-gradient-orange)"
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
              <linearGradient id="auth-gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fdba74" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#fdba74" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fdba74" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* Floating decorative dots - same style as Home page */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`dot-auth-${i}`}
            className={`absolute w-2 h-2 rounded-full ${
              i % 4 === 0 ? 'bg-purple-200' : i % 4 === 1 ? 'bg-orange-200' : i % 4 === 2 ? 'bg-purple-100' : 'bg-white/20'
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
            <div className="bg-gradient-to-br from-purple-500 to-orange-500 p-3 rounded-2xl shadow-lg shadow-purple-500/30">
              <span className="text-3xl">🐾</span>
            </div>
            <span className="text-3xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent font-bold">
              Питомец+
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-4">
            Вход в аккаунт
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Войдите, чтобы управлять профилями питомцев
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
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                  validationErrors.email ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-orange-400/60'
                }`}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={isLoading}
              />
              {validationErrors.email && (
                <motion.p
                  className="text-sm text-red-500 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {validationErrors.email}
                </motion.p>
              )}
            </motion.div>

            {/* Поле пароля */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
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
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 bg-white/10 backdrop-blur-sm ${
                    validationErrors.password ? 'border-red-400 bg-red-500/20' : 'border-white/30 hover:border-orange-400/60'
                  }`}
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-orange-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {validationErrors.password && (
                <motion.p
                  className="text-sm text-red-500 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {validationErrors.password}
                </motion.p>
              )}
            </motion.div>

            {/* Кнопка отправки - same style as Home page CTA */}
            <motion.button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-orange-500 text-white font-bold py-4 px-8 rounded-2xl hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group"
              disabled={isLoading}
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

              {isLoading ? (
                <>
                  <ButtonLoader />
                  <span>Вход...</span>
                </>
              ) : (
                <span>Войти</span>
              )}
            </motion.button>
          </form>

          {/* Ссылка на регистрацию */}
          <motion.div
            className="mt-8 text-center relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <span className="text-white/80">Нет аккаунта? </span>
            <Link
              to="/register"
              className="text-white font-semibold hover:text-orange-300 transition-all duration-200 relative group"
            >
              Зарегистрироваться
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </motion.div>

          <div className="relative z-10"></div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Login
