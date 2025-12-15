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
import PetList from './pages/PetProfile/PetList'
import PetForm from './pages/PetProfile/PetForm'
import PetProfile from './pages/PetProfile/PetProfile'
import Shop from './pages/Shop/Shop'
import Cart from './pages/Shop/Cart'
import Courses from './pages/Training/Courses'
import Profile from './pages/Dashboard/Profile'

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
        
        {/* Магазин - Публичный */}
        <Route path="/shop" element={<Shop />} />
        
        {/* Курсы - Публичный каталог */}
        <Route path="/courses" element={<Courses />} />
        
        {/* Защищённые маршруты - Требуют аутентификации */}
        <Route element={<PrivateRoute />}>
          {/* Питомцы */}
          <Route path="/pets" element={<PetList />} />
          <Route path="/pets/new" element={<PetForm />} />
          <Route path="/pets/:id" element={<PetProfile />} />
          <Route path="/pets/:id/edit" element={<PetForm />} />
          
          {/* Корзина - Защищённая */}
          <Route path="/cart" element={<Cart />} />
          
          {/* Профиль */}
          <Route path="/profile" element={<Profile />} />
        </Route>
        
        {/* Fallback - Редирект на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
