/**
 * Admin Store - Zustand хранилище для админ-панели
 *
 * Использует токены из основного authStore для авторизации.
 * Добавляет специфичную для админки логику и состояние.
 * 
 * Синхронизируется с authStore через setUser().
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminAPI } from '../utils/api';

export const useAdminStore = create(
  persist(
    (set, get) => ({
      // Состояние аутентификации админа
      isAuthenticated: false,
      user: null,
      role: null, // 'superuser' | 'staff' | null

      // Состояние приложения
      loading: false,
      error: null,
      lastChecked: null,

      // Проверка аутентификации администратора через API
      checkAuth: async () => {
        // Берём токен из основного хранилища (localStorage)
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          set({ isAuthenticated: false, user: null, role: null });
          return false;
        }

        set({ loading: true });

        try {
          // Проверяем токен через API (запрос к stats/summary)
          const response = await adminAPI.stats.summary();
          
          // Если запрос прошёл успешно - пользователь авторизован как админ
          set({
            isAuthenticated: true,
            error: null,
            loading: false,
            lastChecked: new Date().toISOString(),
          });
          
          return true;
        } catch (error) {
          console.error('Admin auth check failed:', error);
          
          // Если 403 - пользователь авторизован, но не админ
          if (error.response?.status === 403) {
            set({
              isAuthenticated: false,
              error: 'Недостаточно прав для доступа к админ-панели',
              role: null,
              loading: false,
            });
          } else if (error.response?.status === 401) {
            // Токен истёк или недействителен
            set({
              isAuthenticated: false,
              error: 'Требуется авторизация',
              user: null,
              role: null,
              loading: false,
            });
          } else {
            set({
              isAuthenticated: false,
              error: 'Ошибка проверки доступа',
              loading: false,
            });
          }
          
          return false;
        }
      },

      // Установка информации о пользователе из основного authStore
      setUser: (user) => {
        if (!user) {
          set({ user: null, role: null, isAuthenticated: false });
          return;
        }

        const role = user.is_superuser ? 'superuser' : (user.is_staff ? 'staff' : null);
        
        set({
          user,
          role,
          isAuthenticated: !!role, // Только staff и superuser могут быть админами
          error: null,
        });
      },

      // Получение роли пользователя
      getRole: () => {
        const { user } = get();
        if (!user) return null;
        if (user.is_superuser) return 'superuser';
        if (user.is_staff) return 'staff';
        return null;
      },

      // Проверка прав на определённое действие
      hasPermission: (permission) => {
        const { role } = get();
        
        // Superuser имеет все права
        if (role === 'superuser') return true;
        
        // Staff имеет ограниченные права
        if (role === 'staff') {
          const staffPermissions = [
            'view_dashboard',
            'view_analytics',
            'view_orders',
            'edit_orders',
            'view_products',
            'view_courses',
            'edit_courses',
            'export_data',
          ];
          return staffPermissions.includes(permission);
        }
        
        return false;
      },

      // Выход (очистка состояния админки)
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          role: null,
          error: null,
          lastChecked: null,
        });
      },

      // Общие действия
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'admin-store',
      partialize: (state) => ({
        // Сохраняем только необходимое
        role: state.role,
        lastChecked: state.lastChecked,
      }),
    }
  )
);

// Экспортируем для совместимости с существующим кодом
export const adminStore = useAdminStore;
