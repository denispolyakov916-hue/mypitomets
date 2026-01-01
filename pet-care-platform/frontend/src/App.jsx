/**
 * Главный компонент приложения
 * 
 * Определяет структуру приложения и конфигурацию маршрутизации.
 * 
 * Структура маршрутов:
 *   /                 - Главная страница (лендинг/дашборд в зависимости от авторизации)
 *   /login            - Страница входа
 *   /register         - Страница регистрации
 *   /pet-id           - Pet ID: цифровые паспорта питомцев (создание, редактирование, список)
 *   /shop             - Каталог товаров
 *   /cart             - Корзина покупок
 *   /checkout         - Единый checkout (товары + курсы)
 *   /courses          - Каталог курсов
 *   /training/courses/:id/learn - Страница обучения курсу
 *   /training/lessons/:id - Страница урока
 *   /profile          - Профиль пользователя
 *   /admin-panel/*    - React админ-панель (для staff пользователей)
 * 
 * Защищённые маршруты:
 *   Все маршруты кроме /, /login, /register, /shop, /courses
 *   требуют аутентификации (JWT токен)
 * 
 * Административные маршруты (/admin-panel/*):
 *   Требуют is_staff=True или is_superuser=True
 */

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Компоненты Layout
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'

// Скелетоны для ленивой загрузки
import { CourseLearningPageSkeleton, LessonPageSkeleton } from './components/Skeletons'

// Компоненты страниц (синхронные - критичные для первой загрузки)
import Home from './pages/Home'
import AuthModal from './pages/Auth/AuthModal'
import Activate from './pages/Auth/Activate'
import PetList from './pages/PetProfile/PetList'
import PetForm from './pages/PetProfile/PetForm'
import PetProfile from './pages/PetProfile/PetProfile'
import Shop from './pages/Shop/Shop'
import ProductDetail from './pages/Shop/ProductDetail'
import Cart from './pages/Shop/Cart'
import UnifiedCheckout from './pages/Checkout/UnifiedCheckout'
import PaymentMethodSelection from './pages/Checkout/PaymentMethodSelection'
import Courses from './pages/Training/Courses'
import CourseDetail from './pages/Training/CourseDetail'
import Payment from './pages/Payment/Payment'
import Profile from './pages/Dashboard/Profile'
import Settings from './pages/Dashboard/Settings'
import HealthDiary from './pages/HealthDiary/HealthDiary'
import Orders from './pages/Orders/Orders'
import OrderDetail from './pages/Orders/OrderDetail'
import PetIdPage from './pages/PetId/PetIdPage'

// Ленивая загрузка тяжёлых страниц обучения
const CourseLearningPage = lazy(() => import('./pages/Training/Learning/CourseLearningPage'))
const CoursePageLearning = lazy(() => import('./pages/Training/Learning/CoursePageLearning'))
const LessonPage = lazy(() => import('./pages/Training/Learning/LessonPage'))
const CourseBuilderPage = lazy(() => import('./pages/CourseBuilder/CourseBuilderPage'))

// Ленивая загрузка React админ-панели
const AdminApp = lazy(() => import('./admin/App'))

// Хранилище для состояния аутентификации
import { useAuthStore } from './store/authStore'

/**
 * AdminPanelLoader - Скелетон загрузки админ-панели
 */
const AdminPanelLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-lg text-gray-600">Загрузка админ-панели...</p>
    </div>
  </div>
)

/**
 * Компонент App
 *
 * Корневой компонент, настраивающий роутинг и layout.
 * Использует компонент Layout для единообразной навигации на всех страницах.
 */
function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* ============================================= */}
      {/* REACT АДМИН-ПАНЕЛЬ - Отдельный Layout */}
      {/* ============================================= */}
      <Route
        path="/admin-panel/*"
        element={
          <AdminRoute>
            <Suspense fallback={<AdminPanelLoader />}>
              <AdminApp />
            </Suspense>
          </AdminRoute>
        }
      />

      {/* ============================================= */}
      {/* ОСНОВНОЙ САЙТ - С общим Layout */}
      {/* ============================================= */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/" element={<Home />} />
              <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/pet-id" /> : <AuthModal />}
              />
              <Route
                path="/register"
                element={isAuthenticated ? <Navigate to="/pet-id" /> : <AuthModal />}
              />
              <Route path="/activate" element={<Activate />} />

              {/* Магазин - Публичный */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/products/:id" element={<ProductDetail />} />

              {/* Курсы - Публичный каталог */}
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />

              {/* Оплата - Требует аутентификации */}
              <Route path="/payment" element={<Payment />} />

              {/* Защищённые маршруты - Требуют аутентификации */}
              <Route element={<PrivateRoute />}>
                {/* Питомцы - редиректы на Pet ID */}
                <Route path="/pets" element={<Navigate to="/pet-id" replace />} />
                <Route path="/pets/new" element={<Navigate to="/pet-id" replace />} />
                <Route path="/pets/:id" element={<Navigate to="/pet-id" replace />} />
                <Route path="/pets/:id/edit" element={<Navigate to="/pet-id" replace />} />

                {/* Pet ID*/}
                <Route path="/pet-id" element={<PetIdPage />} />

                {/* Корзина */}
                <Route path="/cart" element={<Cart />} />

                {/* Единый Checkout - Защищённый */}
                <Route path="/checkout" element={<UnifiedCheckout />} />
                <Route path="/payment-method" element={<PaymentMethodSelection />} />

                {/* Профиль */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />

                {/* Заказы */}
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />

                {/* Дневник здоровья */}
                <Route path="/health-diary" element={<HealthDiary />} />

                {/* Система обучения (ленивая загрузка) */}
                <Route
                  path="/training/courses/:courseId/learn"
                  element={
                    <Suspense fallback={<CourseLearningPageSkeleton />}>
                      <CourseLearningPage />
                    </Suspense>
                  }
                />
                {/* Новая система обучения с архитектурой страниц */}
                <Route
                  path="/training/courses/:courseId/learn/pages/:pageId"
                  element={
                    <Suspense fallback={<LessonPageSkeleton />}>
                      <CoursePageLearning />
                    </Suspense>
                  }
                />
                <Route
                  path="/training/lessons/:lessonId"
                  element={
                    <Suspense fallback={<LessonPageSkeleton />}>
                      <LessonPage />
                    </Suspense>
                  }
                />

                {/* Конструктор курсов (только для администраторов) */}
                <Route
                  path="/admin/courses/:courseId/builder"
                  element={
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Загрузка конструктора...</div></div>}>
                      <CourseBuilderPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Fallback - Редирект на главную */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}

export default App
