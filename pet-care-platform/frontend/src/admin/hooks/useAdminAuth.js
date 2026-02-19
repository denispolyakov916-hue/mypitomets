/**
 * useAdminAuth - Хук для проверки авторизации администратора
 *
 * Использует основной authStore и проверяет права доступа.
 */

import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Хук для получения состояния авторизации администратора
 *
 * @returns {Object} - Состояние авторизации
 */
export const useAdminAuth = () => {
  const adminStore = useAdminStore();
  const authStore = useAuthStore();

  // Объединяем данные из обоих store
  return {
    // Администратор авторизован если:
    // 1. Есть токен в основном store
    // 2. Пользователь имеет права staff или superuser
    isAuthenticated: adminStore.isAuthenticated && authStore.isAuthenticated,
    
    // Данные пользователя из основного store
    user: authStore.user,
    
    // Роль из admin store
    role: adminStore.role,
    
    // Флаги прав
    isAdmin: authStore.user?.role === 'admin',
    isCourseCreator: authStore.user?.role === 'course_creator',
    isStaff: authStore.user?.is_staff || false,
    isSuperuser: authStore.user?.is_superuser || false,
    
    // Состояние загрузки
    loading: adminStore.loading || authStore.loading,
    
    // Ошибки
    error: adminStore.error,
  };
};

export default useAdminAuth;
