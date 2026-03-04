import { Routes, Route, Navigate } from 'react-router-dom'

import PagesIndex from './Оглавление'

import Home from './Главная'
import LoginPage from './Вход'
import RegisterPage from './Регистрация'
import AuthModal from './АвторизацияМодалка'
import Activate from './Активация'
import ForgotPassword from './ВосстановлениеПароля'
import ResetPassword from './СбросПароля'

import Shop from './Магазин'
import ProductDetail from './Товар'
import Cart from './Корзина'

import BreedsPage from './Породы'
import BreedDetailPage from './Порода'

import Courses from './Курсы'
import CourseDetail from './Курс'

import PetIdPage from './ПаспортПитомца'
import PetDetailPage from './Питомец'
import PetEditPage from './РедактированиеПитомца'

import FoodRecommendationPage from './ПодборКорма'
import Favorites from './Избранное'
import UnifiedCheckout from './Оформление'
import PaymentMethodSelection from './СпособОплаты'
import Payment from './Оплата'

import Profile from './Профиль'
import Settings from './Настройки'

import Orders from './Заказы'
import OrderDetail from './Заказ'

import HealthDiary from './ДневникЗдоровья'
import CoursePageLearning from './Обучение'
import CourseBuilderPage from './КонструкторКурса'

import Error400 from './Ошибка400'
import Error403 from './Ошибка403'
import Error404 from './Ошибка404'
import Error500 from './Ошибка500'

function PagesRouter() {
  return (
    <Routes>
      <Route index element={<PagesIndex />} />

      {/* Публичные */}
      <Route path="home" element={<Home />} />
      <Route path="login-page" element={<LoginPage />} />
      <Route path="register-page" element={<RegisterPage />} />
      <Route path="auth-modal" element={<AuthModal />} />
      <Route path="activate" element={<Activate />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />

      <Route path="shop" element={<Shop />} />
      <Route path="shop/products/:id" element={<ProductDetail />} />

      <Route path="breeds" element={<BreedsPage />} />
      <Route path="breeds/:slug" element={<BreedDetailPage />} />

      <Route path="courses" element={<Courses />} />
      <Route path="courses/:id" element={<CourseDetail />} />

      {/* Обычно защищённые */}
      <Route path="pet-id" element={<PetIdPage />} />
      <Route path="pet-id/:id" element={<PetDetailPage />} />
      <Route path="pets/:petId/edit" element={<PetEditPage />} />
      <Route path="food-recommendation" element={<FoodRecommendationPage />} />

      <Route path="cart" element={<Cart />} />
      <Route path="favorites" element={<Favorites />} />

      <Route path="checkout" element={<UnifiedCheckout />} />
      <Route path="payment-method" element={<PaymentMethodSelection />} />
      <Route path="payment" element={<Payment />} />

      <Route path="profile" element={<Profile />} />
      <Route path="settings" element={<Settings />} />

      <Route path="orders" element={<Orders />} />
      <Route path="orders/:id" element={<OrderDetail />} />

      <Route path="health-diary" element={<HealthDiary />} />

      <Route path="training/courses/:courseId/learn" element={<CoursePageLearning />} />
      <Route path="training/courses/:courseId/learn/pages/:pageId" element={<CoursePageLearning />} />

      <Route path="admin/courses/:courseId/builder" element={<CourseBuilderPage />} />

      {/* Ошибки */}
      <Route path="400" element={<Error400 />} />
      <Route path="403" element={<Error403 />} />
      <Route path="404" element={<Error404 />} />
      <Route path="500" element={<Error500 />} />

      <Route path="*" element={<Navigate to="/pages" replace />} />
    </Routes>
  )
}

export default PagesRouter
