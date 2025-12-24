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
  },
  {
    icon: '📅',
    title: 'Умный календарь',
    description: 'Напоминания о прививках, визитах к ветеринару и доставках корма. Все события в одном месте.'
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
    <div className="animate-fadeIn">
      {/* Секция Hero */}
      <section className="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Всё для вашего питомца в одном месте
            </h1>
            <p className="text-lg sm:text-xl text-primary-100 mb-8">
              Питомец+ — цифровая экосистема для заботливых владельцев. Храните данные о питомце, 
              покупайте корм с персональными рекомендациями, учитесь уходу у профессионалов.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/pets" 
                    className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-lg 
                             hover:bg-primary-50 transition-colors"
                  >
                    Мои питомцы
                  </Link>
                  <Link 
                    to="/shop" 
                    className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg 
                             hover:bg-white/10 transition-colors"
                  >
                    Перейти в магазин
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/register" 
                    className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-lg 
                             hover:bg-primary-50 transition-colors"
                  >
                    Начать бесплатно
                  </Link>
                  <Link 
                    to="/login" 
                    className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg 
                             hover:bg-white/10 transition-colors"
                  >
                    Войти
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Секция функций */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Возможности платформы
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Питомец+ объединяет всё необходимое для счастливой жизни вашего питомца
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="card text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center 
                              text-4xl mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
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
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Готовы начать?
            </h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Создайте профиль вашего питомца за пару минут и получите доступ 
              ко всем возможностям платформы
            </p>
            
            {!isAuthenticated && (
              <Link 
                to="/register" 
                className="btn-primary text-lg py-3 px-8 inline-block"
              >
                Зарегистрироваться бесплатно
              </Link>
            )}
            
            {isAuthenticated && (
              <Link 
                to="/pets/new" 
                className="btn-primary text-lg py-3 px-8 inline-block"
              >
                Добавить питомца
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
