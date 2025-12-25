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

/**
 * Компонент Navbar с адаптивным дизайном
 * 
 * Функции:
 * - Десктоп: горизонтальное меню
 * - Мобайл: бургер-меню с выезжающей панелью
 * - Подсветка активных ссылок
 * - Бейдж корзины с количеством товаров
 */
function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()
  const { itemsCount } = useCartStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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
  
  /**
   * Стилизация ссылки навигации на основе активного состояния
   */
  const linkClass = (path) => {
    const base = 'px-3 py-2 rounded-lg text-sm font-medium transition-colors'
    return isActive(path)
      ? `${base} bg-primary-50 text-primary-700`
      : `${base} text-gray-600 hover:text-primary-600 hover:bg-gray-50`
  }
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Логотип и бренд */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span className="text-xl font-bold text-primary-600">Питомец+</span>
            </Link>
          </div>
          
          {/* Десктопная навигация */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/shop" className={linkClass('/shop')}>
              Магазин
            </Link>
            <Link to="/courses" className={linkClass('/courses')}>
              Курсы
            </Link>
            
            {isAuthenticated && (
              <>
                <Link to="/pets" className={linkClass('/pets')}>
                  Мои питомцы
                </Link>
                <Link to="/orders" className={linkClass('/orders')}>
                  Заказы
                </Link>
                <Link to="/health-diary" className={linkClass('/health-diary')}>
                  Дневник здоровья
                </Link>
                <Link to="/profile" className={linkClass('/profile')}>
                  Профиль
                </Link>
              </>
            )}
          </div>
          
          {/* Правая сторона - Авторизация и корзина */}
          <div className="hidden md:flex items-center gap-3">
            {/* Иконка корзины */}
            {isAuthenticated && (
              <>
                <Link 
                  to="/cart" 
                  className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {itemsCount > 9 ? '9+' : itemsCount}
                    </span>
                  )}
                </Link>
                {/* Заказы */}
                <OrdersDropdown />
              </>
            )}
            
            {/* Кнопки авторизации */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Выйти
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm">
                  Войти
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
          
          {/* Кнопка мобильного меню */}
          <div className="md:hidden flex items-center gap-3">
            {/* Мобильная корзина */}
            {isAuthenticated && (
              <>
                <Link 
                  to="/cart" 
                  className="relative p-2 text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {itemsCount > 9 ? '9+' : itemsCount}
                    </span>
                  )}
                </Link>
                {/* Мобильные заказы */}
                <Link 
                  to="/profile?tab=orders" 
                  className="relative p-2 text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </Link>
              </>
            )}
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fadeIn">
          <div className="px-4 py-3 space-y-2">
            <Link 
              to="/shop" 
              className={`block ${linkClass('/shop')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Магазин
            </Link>
            <Link 
              to="/courses" 
              className={`block ${linkClass('/courses')}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Курсы
            </Link>
            
            {isAuthenticated && (
              <>
                <Link 
                  to="/pets" 
                  className={`block ${linkClass('/pets')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Мои питомцы
                </Link>
                <Link 
                  to="/orders" 
                  className={`block ${linkClass('/orders')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Заказы
                </Link>
                <Link
                  to="/health-diary"
                  className={`block ${linkClass('/health-diary')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Дневник здоровья
                </Link>
                <Link
                  to="/profile"
                  className={`block ${linkClass('/profile')}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Профиль
                </Link>
              </>
            )}
            
            <div className="pt-2 border-t border-gray-100">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full btn-secondary text-sm"
                >
                  Выйти
                </button>
              ) : (
                <div className="flex gap-2">
                  <Link 
                    to="/login" 
                    className="flex-1 btn-secondary text-sm text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Войти
                  </Link>
                  <Link 
                    to="/register" 
                    className="flex-1 btn-primary text-sm text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Регистрация
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
