/**
 * AdminApp - Главный компонент React админ-панели
 *
 * Этот компонент НЕ создаёт свой Router, так как использует
 * общий Router из основного приложения.
 *
 * Авторизация проверяется в AdminRoute, поэтому здесь
 * мы только синхронизируем состояние и рендерим маршруты.
 *
 * Для доступа требуется:
 * - Авторизация (JWT токен)
 * - Роль staff (is_staff=True в базе)
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout components
import AdminLayout from './components/Layout/AdminLayout';

// Auth components
import { AdminLoginPage } from './components/Auth';

// Dashboard components
import DashboardSelector from './components/Dashboard/DashboardSelector';

// Analytics components
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import { ChartBuilder } from './components/ChartBuilder';

// Table components
import UsersTable from './components/Tables/UsersTable';
import PetsTable from './components/Tables/PetsTable';
import ProductsTable from './components/Tables/ProductsTable';
import OrdersTable from './components/Tables/OrdersTable';
import CoursesTable from './components/Tables/CoursesTable';

// Course creation and editing
import CourseEditorPage from './components/Courses/CourseEditorPage';

// Stores
import { useAdminStore } from './stores/adminStore';
import { useAuthStore } from '../store/authStore';

/**
 * AdminApp - Главный компонент админ-панели
 * 
 * Авторизация уже проверена в AdminRoute.
 * Здесь мы синхронизируем adminStore с authStore и рендерим маршруты.
 */
const AdminApp = () => {
  const { user } = useAuthStore();
  const { setUser, checkAuth } = useAdminStore();

  // Синхронизация пользователя из authStore в adminStore
  useEffect(() => {
    if (user) {
      setUser(user);
      // Проверяем доступ к админ API
      checkAuth().catch(err => {
        console.warn('Admin API check failed:', err);
      });
    }
  }, [user, setUser, checkAuth]);

  return (
    <AdminLayout>
      <Routes>
        {/* Страница входа (для прямого доступа по URL) */}
        <Route path="login" element={<AdminLoginPage />} />
        
        {/* Главный дашборд */}
        <Route index element={<DashboardSelector />} />
        <Route path="dashboard" element={<DashboardSelector />} />

        {/* Аналитика */}
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="analytics/builder" element={<ChartBuilder />} />

        {/* Таблицы данных */}
        <Route path="users" element={<UsersTable />} />
        <Route path="pets" element={<PetsTable />} />
        <Route path="products" element={<ProductsTable />} />
        <Route path="orders" element={<OrdersTable />} />
        <Route path="courses" element={<CoursesTable />} />

        {/* Редактирование курса (единый редактор) */}
        <Route path="courses/:id/edit" element={<CourseEditorPage />} />

        {/* Редирект для неизвестных маршрутов */}
        <Route path="*" element={<Navigate to="/admin-panel/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminApp;
