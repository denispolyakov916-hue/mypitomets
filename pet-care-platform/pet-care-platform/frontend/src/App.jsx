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
 *   /training/courses/:id/learn - Страница обучения курсу (Stepik-стиль)
 *   /training/courses/:id/learn/pages/:pageId - Конкретная страница урока
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
import SupplierRoute from './components/SupplierRoute'
import SpecialistRoute from './components/SpecialistRoute'

// Витрина страниц (для редизайна)
import PagesRouter from './Страницы/Роутер'

// Страницы ошибок
import Error404 from './pages/Errors/Error404'
import ErrorBoundary from './components/ErrorBoundary'

// Скелетоны для ленивой загрузки
import { LessonPageSkeleton } from './components/Skeletons'
import Loader from './components/Loader'

// Компоненты страниц (синхронные - критичные для первой загрузки)
import LandingPage from './pages/LandingPage'
// Воронка подбора (синхронные: переход кликом не должен подвешивать lazy-чанк под AnimatePresence)
import HomePage from './pages/Funnel/HomePage'
import StartPage from './pages/Funnel/StartPage'
import PetQuizPage from './pages/Funnel/PetQuizPage'
import QuizLoadingPage from './pages/Funnel/QuizLoadingPage'
import RecommendationsPage from './pages/Funnel/RecommendationsPage'
import { resolvePostAuthRedirect } from './utils/postAuthRedirect'
import AuthModal from './pages/Auth/AuthModal'
import Activate from './pages/Auth/Activate'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import ComingSoon from './pages/ComingSoon/ComingSoon'
import About from './pages/About/About'

// Ленивая загрузка страниц пород
const BreedsPage = lazy(() => import('./pages/Breeds/BreedsPage'))
const BreedDetailPage = lazy(() => import('./pages/Breeds/BreedDetailPage'))
const NewsEventsPage = lazy(() => import('./pages/NewsEvents/NewsEventsPage'))
const EventDetailPage = lazy(() => import('./pages/NewsEvents/EventDetailPage'))
const NewsDetailPage = lazy(() => import('./pages/NewsEvents/NewsDetailPage'))
import Shop from './pages/Shop/Shop'
import ProductDetail from './pages/Shop/ProductDetail'
import Cart from './pages/Shop/Cart'
import Courses from './pages/Training/Courses'
import CourseDetail from './pages/Training/CourseDetail'
import Payment from './pages/Payment/Payment'
import Profile from './pages/Dashboard/Profile'
import Favorites from './pages/Favorites'
import SharedWishlistPage from './pages/Wishlist/SharedWishlistPage'
import RequestAccessPage from './pages/PartnerAccess/RequestAccessPage'

// Ленивая загрузка некритичных страниц (улучшает время первой загрузки)
const UnifiedCheckout = lazy(() => import('./pages/Checkout/UnifiedCheckout'))
const PaymentMethodSelection = lazy(() => import('./pages/Checkout/PaymentMethodSelection'))
const Settings = lazy(() => import('./pages/Dashboard/Settings'))
const HealthDiary = lazy(() => import('./pages/HealthDiary/HealthDiary'))
const Orders = lazy(() => import('./pages/Orders/Orders'))
const OrderDetail = lazy(() => import('./pages/Orders/OrderDetail'))
const PetIdPage = lazy(() => import('./pages/PetId/PetIdPage'))
const PetDetailPage = lazy(() => import('./pages/PetId/PetDetailPage'))
const PetEditPage = lazy(() => import('./pages/PetId/PetEditPage'))

// Ленивая загрузка тяжёлых страниц обучения
const CoursePageLearning = lazy(() => import('./pages/Training/Learning/CoursePageLearning'))
const CourseBuilderPage = lazy(() => import('./pages/CourseBuilder/CourseBuilderPage'))
const BrandKit = lazy(() => import('./pages/BrandKit/BrandKit')) // dev: /brand-kit — витрина Brand UI Kit

// Правовые документы (публичные) — ленивая загрузка
const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy'))
const TermsOfUse = lazy(() => import('./pages/Legal/TermsOfUse'))
const DataConsent = lazy(() => import('./pages/Legal/DataConsent'))
const Offer = lazy(() => import('./pages/Legal/Offer'))

// Ленивая загрузка React админ-панели
const AdminApp = lazy(() => import('./admin/App'))
const SupplierApp = lazy(() => import('./supplier/App'))
const SpecialistApp = lazy(() => import('./specialist/App'))

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
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

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

      <Route
        path="/supplier-panel/*"
        element={
          <SupplierRoute>
            <Suspense fallback={<AdminPanelLoader />}>
              <SupplierApp />
            </Suspense>
          </SupplierRoute>
        }
      />

      <Route
        path="/specialist-panel/*"
        element={
          <SpecialistRoute>
            <Suspense fallback={<AdminPanelLoader />}>
              <SpecialistApp />
            </Suspense>
          </SpecialistRoute>
        }
      />

      {/* ============================================= */}
      {/* ОСНОВНОЙ САЙТ - Общий Layout с хедером на всех страницах */}
      {/* ============================================= */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              {/* Главная — с тем же хедером и вкладками, что и во всём проекте */}
              <Route path="/" element={<HomePage />} />
              {/* Старый статический лендинг сохранён */}
              <Route path="/landing" element={<LandingPage />} />
              {/* Воронка подбора (публичная) */}
              <Route path="/start" element={<StartPage />} />
              <Route path="/pet-quiz" element={<PetQuizPage />} />
              <Route path="/pet-quiz/loading" element={<QuizLoadingPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              {/* Публичные маршруты */}
              <Route path="/pages/*" element={<PagesRouter />} />
              <Route
                path="/login"
                element={isAuthenticated ? <Navigate to={resolvePostAuthRedirect()} /> : <AuthModal />}
              />
              <Route
                path="/register"
                element={isAuthenticated ? <Navigate to={resolvePostAuthRedirect()} /> : <AuthModal />}
              />
              <Route path="/activate" element={<Activate />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Заявка на партнёрский доступ — публичный маршрут.
                  Гость видит приглашение войти; залогиненный — форму заявки.
                  Предвыбор роли через ?role=supplier|course_specialist. */}
              <Route path="/partner-access" element={<RequestAccessPage />} />

              {/* Заглушка «В разработке» — публичная */}
              <Route path="/coming-soon" element={<ComingSoon />} />
              {/* О нас — публичная страница истории и миссии проекта */}
              <Route path="/about" element={<About />} />

              {/* Правовые документы — публичные (открываются из футера и при регистрации) */}
              <Route
                path="/privacy"
                element={
                  <Suspense fallback={<Loader />}>
                    <PrivacyPolicy />
                  </Suspense>
                }
              />
              <Route
                path="/terms"
                element={
                  <Suspense fallback={<Loader />}>
                    <TermsOfUse />
                  </Suspense>
                }
              />
              <Route
                path="/consent"
                element={
                  <Suspense fallback={<Loader />}>
                    <DataConsent />
                  </Suspense>
                }
              />
              <Route
                path="/offer"
                element={
                  <Suspense fallback={<Loader />}>
                    <Offer />
                  </Suspense>
                }
              />

              {/* Brand UI Kit — внутренняя витрина компонентов.
                  Монтируется ТОЛЬКО в dev: в продакшне /brand-kit отдаёт обычный 404
                  (не утекает «kitchen-sink» наружу). ErrorBoundary гасит возможные
                  ошибки рендера демо-компонентов, чтобы не показывать «Что-то пошло не так». */}
              {import.meta.env.DEV && (
                <Route
                  path="/brand-kit"
                  element={
                    <ErrorBoundary>
                      <Suspense fallback={<Loader />}>
                        <BrandKit />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
              )}

              {/* Магазин - Публичный */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/products/:id" element={<ProductDetail />} />

              {/* Вишлист по ссылке — публичный (без авторизации) */}
              <Route path="/wishlist/shared/:token" element={<SharedWishlistPage />} />

              {/* Породы - Публичный */}
              <Route
                path="/breeds"
                element={
                  <Suspense fallback={<Loader />}>
                    <BreedsPage />
                  </Suspense>
                }
              />
              <Route
                path="/breeds/:slug"
                element={
                  <Suspense fallback={<Loader />}>
                    <BreedDetailPage />
                  </Suspense>
                }
              />

              {/* Курсы - Публичный каталог */}
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />

              {/* Новости и Мероприятия - Публичный */}
              <Route path="/news-events" element={<Suspense fallback={<Loader />}><NewsEventsPage /></Suspense>} />
              <Route path="/news-events/events/:slug" element={<Suspense fallback={<Loader />}><EventDetailPage /></Suspense>} />
              <Route path="/news-events/news/:slug" element={<Suspense fallback={<Loader />}><NewsDetailPage /></Suspense>} />

              {/* Оплата - Требует аутентификации */}
              <Route path="/payment" element={<Payment />} />

              {/* Подбор питания (ссылка из футера) — ведём ВСЕХ в единую воронку /start,
                  чтобы дизайн/флоу совпадал с подбором с главной (без второй реализации). */}
              <Route path="/food-recommendation" element={<Navigate to="/start" replace />} />

              {/* Защищённые маршруты - Требуют аутентификации */}
              <Route element={<PrivateRoute />}>
                {/* Питомцы - редиректы на Pet ID (для старых URL) */}
                <Route path="/pets" element={<Navigate to="/pet-id" replace />} />
                <Route path="/pets/new" element={<Navigate to="/pet-id" replace />} />

                {/* Pet ID (ленивая загрузка) */}
                <Route
                  path="/pet-id"
                  element={
                    <Suspense fallback={<Loader />}>
                      <PetIdPage />
                    </Suspense>
                  }
                />
                {/* Детальный просмотр питомца с анализом */}
                <Route
                  path="/pet-id/:id"
                  element={
                    <Suspense fallback={<Loader />}>
                      <PetDetailPage />
                    </Suspense>
                  }
                />
                
                {/* Редактирование питомца (Этап 2 - расширенный профиль) */}
                <Route
                  path="/pets/:petId/edit"
                  element={
                    <Suspense fallback={<Loader />}>
                      <PetEditPage />
                    </Suspense>
                  }
                />
                
                {/* Анализ питомца */}
                <Route
                  path="/pets/:petId/analysis"
                  element={
                    <Suspense fallback={<Loader />}>
                      <PetDetailPage />
                    </Suspense>
                  }
                />

                {/* Корзина */}
                <Route path="/cart" element={<Cart />} />

                {/* Избранное */}
                <Route path="/favorites" element={<Favorites />} />

                {/* Вишлист — тот же раздел «Избранное», переключение через таб без смены страницы */}
                <Route path="/wishlist" element={<Navigate to="/favorites?view=wishlist" replace />} />

                {/* Единый Checkout - Защищённый (ленивая загрузка) */}
                <Route
                  path="/checkout"
                  element={
                    <Suspense fallback={<Loader />}>
                      <UnifiedCheckout />
                    </Suspense>
                  }
                />
                <Route
                  path="/payment-method"
                  element={
                    <Suspense fallback={<Loader />}>
                      <PaymentMethodSelection />
                    </Suspense>
                  }
                />

                {/* Профиль */}
                <Route path="/profile" element={<Profile />} />
                <Route
                  path="/settings"
                  element={
                    <Suspense fallback={<Loader />}>
                      <Settings />
                    </Suspense>
                  }
                />

                {/* Заказы (ленивая загрузка) */}
                <Route
                  path="/orders"
                  element={
                    <Suspense fallback={<Loader />}>
                      <Orders />
                    </Suspense>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <Suspense fallback={<Loader />}>
                      <OrderDetail />
                    </Suspense>
                  }
                />

                {/* Дневник здоровья (ленивая загрузка) */}
                <Route
                  path="/health-diary"
                  element={
                    <Suspense fallback={<Loader />}>
                      <HealthDiary />
                    </Suspense>
                  }
                />

                {/* Система обучения — единственный маршрут (Stepik-стиль) */}
                <Route
                  path="/training/courses/:courseId/learn"
                  element={
                    <Suspense fallback={<LessonPageSkeleton />}>
                      <CoursePageLearning />
                    </Suspense>
                  }
                />
                <Route
                  path="/training/courses/:courseId/learn/pages/:pageId"
                  element={
                    <Suspense fallback={<LessonPageSkeleton />}>
                      <CoursePageLearning />
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

              {/* Fallback - Страница 404 */}
              <Route path="*" element={<Error404 />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}

export default App
