/**
 * Компонент главной страницы
 *
 * Лендинг для платформы Питомец+.
 * Показывает разный контент в зависимости от статуса аутентификации:
 * - Неавторизованные: Маркетинговый контент с CTA для регистрации
 * - Авторизованные: Быстрый доступ к питомцам и функциям
 */

import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import PersonalRecommendations from '../components/PersonalRecommendations'
import { motion } from 'framer-motion'

/**
 * Данные карточек функций для лендинга
 */
const features = [
  {
    icon: '🪪',
    title: 'Цифровой паспорт питомца',
    description: 'Храните всю информацию о вашем питомце в одном месте: данные о здоровье, прививки, особенности питания.'
  },
  {
    icon: '🛒',
    title: 'Умный магазин кормов',
    description: 'Персональные рекомендации на основе данных вашего питомца. Автоматический расчёт нормы питания.'
  },
  {
    icon: '📚',
    title: 'Обучающие курсы',
    description: 'Курсы по уходу, дрессировке и воспитанию от профессионалов в удобном видеоформате.'
  }
]

/**
 * Компонент главной страницы
 *
 * Маркетинговый лендинг с обзором функций и CTA.
 */
function Home() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="animate-fadeIn relative">
      {/* Floating decorative elements - dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`dot-hero-${i}`}
            className={`absolute w-2 h-2 rounded-full ${
              i % 3 === 0 ? 'bg-purple-200' : i % 3 === 1 ? 'bg-orange-200' : 'bg-purple-100'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Секция Hero */}
      <section className="relative bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white overflow-hidden">
        {/* Animated wave background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute left-0 right-0"
            style={{ top: '20%' }}
            animate={{
              y: [0, -40, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0,
            }}
          >
            <svg width="100%" height="200" viewBox="0 0 1920 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path
                d="M0,100 Q320,60 640,100 T1280,100 Q1600,60 1920,100"
                stroke="url(#hero-gradient-purple)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity="0.15"
              />
              <defs>
                <linearGradient id="hero-gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d8b4fe" stopOpacity="1" />
                  <stop offset="50%" stopColor="#d8b4fe" stopOpacity="1" />
                  <stop offset="100%" stopColor="#d8b4fe" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              Всё для вашего питомца в одном месте
            </motion.h1>
            <motion.p
              className="text-xl sm:text-2xl text-purple-100 mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Питомец+ — цифровая экосистема для заботливых владельцев. Храните данные о питомце,
              покупайте корм с персональными рекомендациями, учитесь уходу у профессионалов.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {isAuthenticated ? (
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/pet-id"
                      className="bg-white text-purple-600 font-bold py-4 px-10 rounded-full
                               hover:shadow-xl hover:shadow-white/30 transition-all duration-300 text-lg"
                    >
                      Мои питомцы
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/shop"
                      className="border-2 border-white text-white font-bold py-4 px-10 rounded-full
                               hover:bg-white/10 hover:shadow-lg hover:shadow-white/20 transition-all duration-300 text-lg"
                    >
                      Перейти в магазин
                    </Link>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/register"
                      className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 px-10 rounded-full
                               hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 text-lg"
                    >
                      Начать бесплатно
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      to="/login"
                      className="border-2 border-white text-white font-bold py-4 px-10 rounded-full
                               hover:bg-white/10 hover:shadow-lg hover:shadow-white/20 transition-all duration-300 text-lg"
                    >
                      Войти
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Секция функций */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-purple-50/30 to-orange-50/30 relative">
        {/* Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`dot-features-${i}`}
              className={`absolute w-1.5 h-1.5 rounded-full ${
                i % 3 === 0 ? 'bg-purple-200' : i % 3 === 1 ? 'bg-orange-200' : 'bg-purple-100'
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-6">
              Возможности платформы
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Питомец+ объединяет всё необходимое для счастливой жизни вашего питомца
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-center group hover:-translate-y-2 border border-purple-100/50"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className="w-20 h-20 bg-gradient-to-br from-purple-100 to-orange-100 rounded-3xl flex items-center justify-center
                              text-5xl mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 5 }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Персональные рекомендации */}
      {isAuthenticated && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PersonalRecommendations />
          </div>
        </section>
      )}

      {/* Секция CTA */}
      <section className="bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600 py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-10 left-10 w-32 h-32 bg-orange-400/20 rounded-full blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-12 sm:p-16 text-center border border-white/20"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2
              className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Готовы начать?
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Создайте профиль вашего питомца за пару минут и получите доступ
              ко всем возможностям платформы
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
            >
              {!isAuthenticated && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-purple-500 to-orange-500 text-white font-bold text-xl py-4 px-12 rounded-full hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 inline-block"
                  >
                    Зарегистрироваться бесплатно
                  </Link>
                </motion.div>
              )}

              {isAuthenticated && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to="/pet-id"
                    className="bg-gradient-to-r from-purple-500 to-orange-500 text-white font-bold text-xl py-4 px-12 rounded-full hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 inline-block"
                  >
                    Добавить питомца
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Home
