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
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          set({ isAuthenticated: false, user: null, role: null });
          return false;
        }

        const { role } = get();

        // Создатели курсов не имеют доступа к stats/summary —
        // доверяем роли из профиля, она уже установлена через setUser()
        if (role === 'course_creator') {
          set({
            isAuthenticated: true,
            error: null,
            loading: false,
            lastChecked: new Date().toISOString(),
          });
          return true;
        }

        set({ loading: true });

        try {
          await adminAPI.stats.summary();
          
          set({
            isAuthenticated: true,
            error: null,
            loading: false,
            lastChecked: new Date().toISOString(),
          });
          
          return true;
        } catch (error) {
          console.error('Admin auth check failed:', error);
          
          if (error.response?.status === 403) {
            set({
              isAuthenticated: false,
              error: 'Недостаточно прав для доступа к админ-панели',
              role: null,
              loading: false,
            });
          } else if (error.response?.status === 401) {
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

        const role = user.role || (user.is_superuser ? 'admin' : (user.is_staff ? 'admin' : null));
        
        set({
          user,
          role,
          isAuthenticated: !!role && role !== 'user',
          error: null,
        });
      },

      // Получение роли пользователя
      getRole: () => {
        const { user } = get();
        if (!user) return null;
        return user.role || null;
      },

      // Проверка прав на определённое действие
      hasPermission: (permission) => {
        const { role } = get();
        
        if (role === 'admin') return true;
        
        if (role === 'course_creator') {
          const creatorPermissions = [
            'view_courses',
            'edit_courses',
          ];
          return creatorPermissions.includes(permission);
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
