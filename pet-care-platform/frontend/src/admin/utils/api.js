/**
 * API клиент для React админ-панели
 *
 * Использует токены из основного authStore (access_token в localStorage).
 * Все эндпоинты защищены IsAdminUser permission на backend.
 */

import axios from 'axios';

// Создаем экземпляр axios для админ API
const adminApi = axios.create({
  baseURL: '/api/',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена авторизации
adminApi.interceptors.request.use(
  (config) => {
    // Берём токен из основного хранилища авторизации
    const token = localStorage.getItem('access_token');
    
    // Debug logging для диагностики
    console.log('[AdminAPI] Request:', config.url, token ? 'with token' : 'NO TOKEN');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[AdminAPI] No access_token in localStorage!');
    }
    return config;
  },
  (error) => {
    console.error('[AdminAPI] Request error:', error);
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
adminApi.interceptors.response.use(
  (response) => {
    console.log('[AdminAPI] Response OK:', response.config.url);
    return response;
  },
  (error) => {
    console.error('[AdminAPI] Response error:', error.response?.status, error.config?.url, error.message);
    
    if (error.response?.status === 401) {
      // Токен истек или недействителен
      console.warn('[AdminAPI] Unauthorized - clearing tokens and redirecting');
      // Очищаем токены
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Редирект на страницу входа админки, а не на основной login
      window.location.href = '/admin-panel';
    } else if (error.response?.status === 403) {
      // Нет прав доступа
      console.warn('[AdminAPI] Forbidden - user does not have admin permissions');
    } else if (!error.response) {
      // Сетевая ошибка
      console.error('[AdminAPI] Network error - backend might be down');
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const adminAPI = {
  // Аутентификация (используем основной API)
  auth: {
    // Логин через основной API
    login: (credentials) => axios.post('/api/auth/login/', credentials),
    refresh: (refreshToken) => axios.post('/api/auth/refresh/', { refresh: refreshToken }),
    logout: () => axios.post('/api/auth/logout/'),
  },

  // Аналитика
  analytics: {
    dashboardOverview: () => adminApi.get('admin/analytics/dashboard_overview/'),
    chartsData: (period = 30) => adminApi.get(`admin/analytics/charts_data/?period=${period}`),
    topProducts: (limit = 10) => adminApi.get(`admin/analytics/top_products/?limit=${limit}`),
    recentOrders: (limit = 10) => adminApi.get(`admin/analytics/recent_orders/?limit=${limit}`),
    // Расширенная аналитика (используем правильные имена методов)
    sales_trends: (params) => adminApi.get('admin/analytics/sales_trends/', { params }),
    users_trends: (params) => adminApi.get('admin/analytics/users_trends/', { params }),
    pets_distribution: () => adminApi.get('admin/analytics/pets_distribution/'),
    orders_trends: (params) => adminApi.get('admin/analytics/orders_trends/', { params }),
    // Drill-down методы (используем правильные имена методов)
    sales_by_products: (params) => adminApi.get('admin/analytics/sales_by_products/', { params }),
    sales_by_category: (params) => adminApi.get('admin/analytics/sales_by_category/', { params }),
    user_activity_detail: (params) => adminApi.get('admin/analytics/user_activity_detail/', { params }),
    orders_delivery_analysis: (params) => adminApi.get('admin/analytics/orders_delivery_analysis/', { params }),
    // Обратная совместимость (старые имена методов)
    salesTrends: (params) => adminApi.get('admin/analytics/sales_trends/', { params }),
    usersTrends: (params) => adminApi.get('admin/analytics/users_trends/', { params }),
    petsDistribution: () => adminApi.get('admin/analytics/pets_distribution/'),
    ordersTrends: (params) => adminApi.get('admin/analytics/orders_trends/', { params }),
    salesByProducts: (params) => adminApi.get('admin/analytics/sales_by_products/', { params }),
    salesByCategory: (params) => adminApi.get('admin/analytics/sales_by_category/', { params }),
    userActivityDetail: (params) => adminApi.get('admin/analytics/user_activity_detail/', { params }),
  },

  // Управление данными
  management: {
    bulkUpdateProducts: (data) => adminApi.post('admin/management/bulk_update_products/', data),
    bulkUpdateOrders: (data) => adminApi.post('admin/management/bulk_update_orders/', data),
    bulkUpdateUsers: (data) => adminApi.post('admin/management/bulk_update_users/', data),
    bulkUpdateCourses: (data) => adminApi.post('admin/management/bulk_update_courses/', data),
    exportData: (data) => adminApi.post('admin/management/export_data/', data, {
      responseType: 'blob' // Для скачивания файлов
    }),
  },

  // CRUD операции - Пользователи
  users: {
    list: (params) => adminApi.get('admin/users/', { params }),
    retrieve: (id) => adminApi.get(`admin/users/${id}/`),
    update: (id, data) => adminApi.patch(`admin/users/${id}/`, data),
    delete: (id) => adminApi.delete(`admin/users/${id}/`),
  },

  // CRUD операции - Питомцы
  pets: {
    list: (params) => adminApi.get('admin/pets/', { params }),
    retrieve: (id) => adminApi.get(`admin/pets/${id}/`),
    update: (id, data) => adminApi.patch(`admin/pets/${id}/`, data),
    delete: (id) => adminApi.delete(`admin/pets/${id}/`),
  },

  // CRUD операции - Товары
  products: {
    list: (params) => adminApi.get('admin/products/', { params }),
    retrieve: (id) => adminApi.get(`admin/products/${id}/`),
    update: (id, data) => adminApi.patch(`admin/products/${id}/`, data),
    delete: (id) => adminApi.delete(`admin/products/${id}/`),
  },

  // CRUD операции - Заказы
  orders: {
    list: (params) => adminApi.get('admin/orders/', { params }),
    retrieve: (id) => adminApi.get(`admin/orders/${id}/`),
    update: (id, data) => adminApi.patch(`admin/orders/${id}/`, data),
    delete: (id) => adminApi.delete(`admin/orders/${id}/`),
  },

  // CRUD операции - Курсы
  courses: {
    list: (params) => adminApi.get('admin/courses/', { params }),
    create: (data) => adminApi.post('admin/courses/', data),
    retrieve: (id) => adminApi.get(`admin/courses/${id}/`),
    update: (id, data) => adminApi.patch(`admin/courses/${id}/`, data),
    delete: (id) => adminApi.delete(`admin/courses/${id}/`),
  },

  // Быстрая статистика
  stats: {
    summary: () => adminApi.get('admin/stats/summary/'),
  },

  // Уведомления (заглушка для будущего развития)
  notifications: {
    list: () => Promise.resolve({ data: [] }),
    markAsRead: (id) => Promise.resolve({ data: { success: true } }),
    markAllAsRead: () => Promise.resolve({ data: { success: true } }),
  },
};

export default adminApi;
