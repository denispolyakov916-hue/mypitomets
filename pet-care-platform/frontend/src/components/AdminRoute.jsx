/**
 * AdminRoute - Защищённый маршрут для административного раздела
 *
 * Обновлённая версия с:
 * - Показом AdminLoginPage вместо редиректа
 * - Загрузкой профиля если user=null но есть токен
 * - Улучшенными сообщениями об ошибках
 *
 * Проверяет:
 * 1. Авторизован ли пользователь (есть JWT токен)
 * 2. Загружен ли профиль пользователя
 * 3. Имеет ли пользователь права администратора (is_staff=True)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AdminLoginPage from '../admin/components/Auth/AdminLoginPage';

/**
 * AdminRoute - Обёртка для защиты админских маршрутов
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Дочерние компоненты для рендеринга
 */
const AdminRoute = ({ children }) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    loadProfile
  } = useAuthStore();
  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const hasLoadedProfile = useRef(false); // Используем ref для отслеживания загрузки

  // Проверка авторизации и загрузка профиля при монтировании (один раз)
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      // Если есть токен но нет данных пользователя - загружаем профиль один раз
      if (isAuthenticated && !user && !hasLoadedProfile.current) {
        hasLoadedProfile.current = true; // Помечаем как загруженный
        try {
          await loadProfile();
        } catch (error) {
          console.error('Failed to load profile:', error);
          hasLoadedProfile.current = false; // Сбрасываем флаг при ошибке
        }
      }
      
      if (isMounted) {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Запускаем только один раз при монтировании

  // Отслеживаем изменения user и isAuthenticated для сброса флага при logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasLoadedProfile.current = false; // Сбрасываем при выходе
    }
  }, [isAuthenticated]);

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-200 text-lg">Проверка доступа...</p>
          <p className="text-blue-300/60 text-sm mt-2">Админ-панель Питомец+</p>
        </div>
      </div>
    );
  }

  // Если не авторизован - показываем страницу входа админки
  if (!isAuthenticated) {
    return (
      <AdminLoginPage />
    );
  }

  // Если авторизован, но user ещё не загружен - ждём
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-200">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  // Проверяем права администратора (is_staff или is_superuser)
  if (!user.is_staff && !user.is_superuser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-slate-800">
        {/* Декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-md mx-auto p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 text-center">
          {/* Иконка */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Доступ ограничен</h1>
          
          <p className="text-red-200 mb-2">
            У вас нет прав администратора для доступа к этой панели.
          </p>
          
          <p className="text-red-300/70 text-sm mb-8">
            Для получения доступа обратитесь к администратору системы. 
            Требуется статус <span className="font-mono bg-white/10 px-2 py-0.5 rounded">is_staff=True</span>
          </p>

          {/* Информация о пользователе */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-200/60 text-xs uppercase tracking-wider mb-2">Текущий аккаунт</p>
            <p className="text-white font-medium">{user.email}</p>
            <p className="text-red-300/60 text-sm mt-1">
              Роль: {user.is_superuser ? 'Суперпользователь' : user.is_staff ? 'Администратор' : 'Пользователь'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              На главную
            </a>
            <a
              href="/profile"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Мой профиль
            </a>
          </div>

          {/* Кнопка выхода */}
          <button
            onClick={async () => {
              await useAuthStore.getState().logout();
              window.location.href = '/admin-panel';
            }}
            className="mt-4 text-red-300 hover:text-white text-sm transition-colors inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Войти под другим аккаунтом
          </button>
        </div>
      </div>
    );
  }

  // Если всё ок - рендерим дочерние компоненты (AdminApp)
  return children;
};

export default AdminRoute;
