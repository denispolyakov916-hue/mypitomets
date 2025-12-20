/**
 * Главный компонент приложения
 * 
 * Определяет структуру приложения и конфигурацию маршрутизации.
 * 
 * Структура маршрутов:
 *   /                 - Главная страница (лендинг/дашборд в зависимости от авторизации)
 *   /login            - Страница входа
 *   /register         - Страница регистрации
 *   /pets             - Список питомцев
 *   /pets/new         - Создание нового питомца
 *   /pets/:id         - Профиль питомца
 *   /pets/:id/edit    - Редактирование питомца
 *   /shop             - Каталог товаров
 *   /cart             - Корзина покупок
 *   /courses          - Каталог курсов
 *   /profile          - Профиль пользователя
 * 
 * Защищённые маршруты:
 *   Все маршруты кроме /, /login, /register, /shop, /courses
 *   требуют аутентификации (JWT токен)
 */

import { Routes, Route, Navigate } from 'react-router-dom'

// Компоненты Layout
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

// Компоненты страниц
import Home from './pages/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Activate from './pages/Auth/Activate'
import PetList from './pages/PetProfile/PetList'
import PetForm from './pages/PetProfile/PetForm'
import PetProfile from './pages/PetProfile/PetProfile'
import Shop from './pages/Shop/Shop'
import ProductDetail from './pages/Shop/ProductDetail'
import ProductCheckout from './pages/Shop/ProductCheckout'
import Cart from './pages/Shop/Cart'
import Courses from './pages/Training/Courses'
import CourseDetail from './pages/Training/CourseDetail'
import CourseCheckout from './pages/Training/CourseCheckout'
import Payment from './pages/Payment/Payment'
import Profile from './pages/Dashboard/Profile'
import Settings from './pages/Dashboard/Settings'
import HealthDiary from './pages/HealthDiary/HealthDiary'

// Хранилище для состояния аутентификации
import { useAuthStore } from './store/authStore'

/**
 * Компонент App
 * 
 * Корневой компонент, настраивающий роутинг и layout.
 * Использует компонент Layout для единообразной навигации на всех страницах.
 */
function App() {
  const { isAuthenticated } = useAuthStore()
  
  return (
    <Layout>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/pets" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/pets" /> : <Register />} 
        />
        <Route path="/activate" element={<Activate />} />
        
        {/* Магазин - Публичный */}
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/products/:id" element={<ProductDetail />} />
        
        {/* Курсы - Публичный каталог */}
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        
        {/* Оплата - Публичная (но требует аутентификации внутри) */}
        <Route path="/payment" element={<Payment />} />
        
        {/* Защищённые маршруты - Требуют аутентификации */}
        <Route element={<PrivateRoute />}>
          {/* Питомцы */}
          <Route path="/pets" element={<PetList />} />
          <Route path="/pets/new" element={<PetForm />} />
          <Route path="/pets/:id" element={<PetProfile />} />
          <Route path="/pets/:id/edit" element={<PetForm />} />
          
          {/* Корзина - Защищённая */}
          <Route path="/cart" element={<Cart />} />
          
          {/* Оформление заказов - Защищённые */}
          <Route path="/shop/checkout" element={<ProductCheckout />} />
          <Route path="/courses/:id/checkout" element={<CourseCheckout />} />
          <Route path="/courses/:id/payment" element={<Payment />} />
          
          {/* Профиль */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Дневник здоровья */}
          <Route path="/health-diary" element={<HealthDiary />} />
        </Route>
        
        {/* Fallback - Редирект на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
