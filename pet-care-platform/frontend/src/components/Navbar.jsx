/**
 * Компонент навигационной панели
 *
 * Главная навигационная шапка с:
 * - Логотипом/ссылкой бренда
 * - Основными ссылками навигации
 * - Меню пользователя (вход/выход)
 * - Иконкой корзины с количеством товаров
 * - Адаптивным мобильным меню
 *
 * Использует authStore для состояния аутентификации.
 * Использует cartStore для количества товаров в корзине.
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import OrdersDropdown from './OrdersDropdown'
import HeaderCounters from './HeaderCounters'

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const services = [
  { id: 'pet-id', label: 'PetID' },
  { id: 'food-recommendation', label: 'Подбор корма' },
  { id: 'shop', label: 'Магазин' },
  { id: 'courses', label: 'Курсы' },
  { id: 'health-diary', label: 'Дневник здоровья' },
];

/**
 * Компонент Navbar с адаптивным дизайном
 *
 * Функции:
 * - Десктоп (xl+): полное горизонтальное меню
 * - Планшеты/Мобайл (md+): бургер-меню с выезжающей панелью
 * - Мобайл (<md): бургер-меню с выезжающей панелью
 * - Подсветка активных ссылок
 * - Бейдж корзины с количеством товаров
 */
function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()
  const itemsCount = useCartStore(s => s.itemsCount)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isServicePage = services.some(service => location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`))

  // Примечание: автоматическое обновление количества товаров выполняется в HeaderCounters
  // для предотвращения дублирования запросов
  
  /**
   * Обработчик выхода
   * Выполняет выход и перенаправляет на главную
   */
  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMobileMenuOpen(false)
  }
  
  /**
   * Проверка активности ссылки
   * @param {string} path - Путь для проверки
   * @returns {boolean} True если текущий маршрут совпадает
   */
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }
  
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#ECFEFF] text-slate-900 shadow-sm z-50 border-b border-[#CFFAFE]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Логотип и бренд */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-[#CFFAFE]">
                <span className="text-2xl">🐾</span>
              </div>
              <span className="text-2xl text-slate-900 font-bold">
                Питомец+
              </span>
            </Link>
          </div>
          
          {/* Десктопная навигация */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm">
            <button
              onClick={() => navigate('/')}
              className={`relative transition-all duration-300 whitespace-nowrap ${
                location.pathname === '/' ? 'text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Главная
              {location.pathname === '/' && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-500 rounded-full"></span>
              )}
            </button>

            {/* Services */}
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => navigate(`/${service.id}`)}
                className={`relative transition-all duration-300 whitespace-nowrap ${
                  location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {service.label}
                {(location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)) && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-500 rounded-full"></span>
                )}
              </button>
            ))}


            {isAuthenticated && (
              <>
                <button
                  onClick={() => navigate('/orders')}
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    location.pathname === '/orders' || location.pathname.startsWith('/orders/') ? 'text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Заказы
                  {(location.pathname === '/orders' || location.pathname.startsWith('/orders/')) && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-500 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Профиль
                  {(location.pathname === '/profile' || location.pathname.startsWith('/profile/')) && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-500 rounded-full"></span>
                  )}
                </button>
              </>
            )}
          </nav>

          {/* Правая сторона - Авторизация и счётчики */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated && <HeaderCounters />}

            {/* Кнопки авторизации */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-slate-700 hover:text-slate-900 transition-all duration-300 relative group"
              >
                Выйти
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 group-hover:w-full transition-all duration-300"></span>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="text-slate-700 hover:text-slate-900 transition-all duration-300 relative group"
                >
                  Вход
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-primary-600 text-white px-6 py-2.5 rounded-full hover:bg-primary-700 transition-all duration-300 font-semibold"
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>
          
          {/* Кнопка мобильного меню */}
          <div className="flex lg:hidden items-center justify-center gap-3">
            {/* Мобильные счётчики (компактнее) */}
            {isAuthenticated && <HeaderCounters />}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-900 flex-shrink-0"
              aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden py-4 border-t border-[#CFFAFE] bg-[#ECFEFF]">
            <nav className="flex flex-col gap-3">
              <button
                onClick={() => {
                  navigate('/')
                  setMobileMenuOpen(false)
                }}
                className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                  location.pathname === '/' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700 hover:bg-primary-50'
                }`}
              >
                Главная
              </button>

              {/* Mobile Services */}
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    navigate(`/${service.id}`)
                    setMobileMenuOpen(false)
                  }}
                  className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-slate-700 hover:bg-primary-50'
                  }`}
                >
                  {service.label}
                </button>
              ))}


              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      navigate('/orders')
                      setMobileMenuOpen(false)
                    }}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === '/orders' || location.pathname.startsWith('/orders/') ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700 hover:bg-primary-50'
                    }`}
                  >
                    Заказы
                  </button>
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setMobileMenuOpen(false)
                    }}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700 hover:bg-primary-50'
                    }`}
                  >
                    Профиль
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  isAuthenticated ? handleLogout() : navigate('/login')
                  setMobileMenuOpen(false)
                }}
              className="text-slate-700 hover:bg-primary-50 hover:text-slate-900 text-left px-4 py-2 rounded-lg transition-all duration-300"
              >
                {isAuthenticated ? 'Выйти' : 'Вход'}
              </button>
              {!isAuthenticated && (
                <button
                  onClick={() => {
                    navigate('/register')
                    setMobileMenuOpen(false)
                  }}
                className="bg-primary-600 text-white px-6 py-2.5 rounded-full hover:bg-primary-700 transition-all duration-300 mt-2 font-semibold"
                >
                  Регистрация
                </button>
              )}
            </nav>
          </div>
        )}
    </header>
  )
}

export default Navbar
