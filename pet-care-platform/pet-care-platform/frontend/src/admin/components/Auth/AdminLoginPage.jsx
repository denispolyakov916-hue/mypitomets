/**
 * AdminLoginPage - Страница входа в админ-панель
 *
 * Специализированная страница входа для администраторов с:
 * - Уникальным дизайном (отличается от пользовательского входа)
 * - Проверкой прав is_staff после входа
 * - Понятными сообщениями об ошибках на русском
 * - Redirect на исходную страницу после успешного входа
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useAdminStore } from '../../stores/adminStore';

/**
 * Компонент страницы входа в админ-панель
 */
const AdminLoginPage = ({ panel = 'admin' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSpecialistPanel = panel === 'specialist' || location.pathname.startsWith('/specialist-panel');
  const isMarketingPanel = panel === 'marketing' || location.pathname.startsWith('/marketing-panel');
  
  // Stores
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const authLoading = useAuthStore(s => s.isLoading);
  const authError = useAuthStore(s => s.error);
  const { login, clearError } = useAuthStore();
  const { setUser, checkAuth } = useAdminStore();
  
  // Local state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Получаем URL для редиректа после входа (вычисляется после авторизации)
  const getPanelBase = () => {
    if (isSpecialistPanel) return '/specialist-panel';
    if (isMarketingPanel) return '/marketing-panel';
    return '/admin-panel';
  };

  const getDefaultPanelPath = (currentUser) => {
    if (currentUser?.role === 'course_creator') return '/specialist-panel/courses';
    if (currentUser?.role === 'marketing_manager') return '/marketing-panel/content';
    if (isSpecialistPanel) return '/specialist-panel/courses';
    if (isMarketingPanel) return '/marketing-panel/content';
    return '/admin-panel/dashboard';
  };

  const hasPanelAccess = (currentUser) => {
    if (!currentUser) return false;
    const isCompanyAdmin = currentUser.is_staff || currentUser.is_superuser || currentUser.role === 'admin';
    if (isMarketingPanel) return isCompanyAdmin || currentUser.role === 'marketing_manager';
    if (isSpecialistPanel) return isCompanyAdmin || currentUser.role === 'course_creator';
    return isCompanyAdmin;
  };

  const getRedirectPath = (currentUser) => {
    // Гвард (AdminRoute/SpecialistRoute/MarketingRoute) рендерит эту форму НА МЕСТЕ,
    // по исходному URL — поэтому глубокий путь берём из state.from → ?redirect= →
    // текущего location.pathname. Ниже он ещё валидируется по префиксу панели.
    const savedPath =
      location.state?.from?.pathname ||
      new URLSearchParams(location.search).get('redirect') ||
      location.pathname;
    if (currentUser?.role === 'course_creator') {
      if (
        savedPath &&
        savedPath.startsWith('/specialist-panel') &&
        savedPath !== '/specialist-panel' &&
        savedPath !== '/specialist-panel/'
      ) {
        return savedPath;
      }
      return '/specialist-panel/courses';
    }

    if (currentUser?.role === 'marketing_manager') {
      if (
        savedPath &&
        savedPath.startsWith('/marketing-panel') &&
        savedPath !== '/marketing-panel' &&
        savedPath !== '/marketing-panel/'
      ) {
        return savedPath;
      }
      return '/marketing-panel/content';
    }

    const currentPanelBase = getPanelBase();
    if (
      savedPath &&
      savedPath.startsWith(currentPanelBase) &&
      savedPath !== currentPanelBase &&
      savedPath !== `${currentPanelBase}/`
    ) {
      return savedPath;
    }

    return getDefaultPanelPath(currentUser);
  };
  const redirectMessage = location.state?.message || '';

  // Очистка ошибок при монтировании
  useEffect(() => {
    clearError();
    setLocalError('');
  }, [clearError]);

  // Если уже авторизован с нужной ролью - редирект
  useEffect(() => {
    if (isAuthenticated && hasPanelAccess(user)) {
      navigate(getRedirectPath(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  /**
   * Валидация формы
   */
  const validateForm = () => {
    if (!email.trim()) {
      setLocalError('Введите email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Неверный формат email');
      return false;
    }
    if (!password) {
      setLocalError('Введите пароль');
      return false;
    }
    if (password.length < 6) {
      setLocalError('Пароль должен быть не менее 6 символов');
      return false;
    }
    return true;
  };

  /**
   * Обработка отправки формы
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLocalError('');
    clearError();
    
    // Валидация формы
    if (!validateForm()) {
      return;
    }
    
    // Предотвращаем повторную отправку
    if (isSubmitting || showSuccess) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await login(email.trim(), password);
      
      if (!success) {
        // Ошибка уже установлена в authStore через set({ error: ... })
        setIsSubmitting(false);
        return;
      }
      
      // Получаем обновлённого пользователя из store
      const currentUser = useAuthStore.getState().user;
      
      if (!currentUser) {
        setLocalError('Не удалось получить данные пользователя');
        setIsSubmitting(false);
        return;
      }
      
      // Проверяем права под конкретный кабинет
      if (!hasPanelAccess(currentUser)) {
        setLocalError('У вас нет прав для доступа к этой панели. Обратитесь к администратору системы.');
        // Выходим, так как обычный пользователь не должен оставаться залогиненным в админке
        await useAuthStore.getState().logout();
        setIsSubmitting(false);
        return;
      }
      
      // Устанавливаем пользователя в adminStore
      setUser(currentUser);
      
      // Проверяем доступ к админ API
      const hasAccess = await checkAuth();
      
      if (hasAccess) {
        setShowSuccess(true);
        const redirectTo = getRedirectPath(currentUser);
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 500);
      } else {
        setLocalError('Не удалось получить доступ к админ-панели. Попробуйте позже.');
        setIsSubmitting(false);
      }
    } catch (error) {
      setLocalError(error.message || 'Произошла неожиданная ошибка при входе');
      setIsSubmitting(false);
    }
  };

  /**
   * Обработка изменения полей
   */
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (localError) setLocalError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (localError) setLocalError('');
  };

  // Определяем текст ошибки для отображения
  const displayError = localError || authError || '';
  
  // Эффект для отображения ошибок из authStore
  useEffect(() => {
    if (authError && !localError && !isSubmitting) {
      // Ошибка из authStore уже отображается через displayError
    }
  }, [authError, localError, isSubmitting]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-900 to-primary-800">
      {/* Декоративные элементы фона */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      {/* Форма входа */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Карточка формы */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            {/* Логотип/Иконка */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isMarketingPanel ? 'Кабинет маркетолога' : isSpecialistPanel ? 'Кабинет специалиста' : 'Админ-панель'}
            </h1>
            <p className="text-primary-200 text-sm">
              {isMarketingPanel
                ? 'Питомец+ | Новости, события и баннеры'
                : isSpecialistPanel
                  ? 'Питомец+ | Курсы коррекции поведения'
                  : 'Питомец+ | Система управления'}
            </p>
          </div>

          {/* Сообщение о редиректе */}
          {redirectMessage && (
            <div className="mb-6 p-3 bg-primary-500/20 border border-primary-400/30 rounded-lg">
              <p className="text-primary-200 text-sm text-center">{redirectMessage}</p>
            </div>
          )}

          {/* Сообщение об успехе */}
          {showSuccess && (
            <div className="mb-6 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
              <p className="text-green-200 text-sm text-center flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Вход выполнен успешно! Перенаправление...
              </p>
            </div>
          )}

          {/* Ошибка */}
          {displayError && !showSuccess && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
              <p className="text-red-200 text-sm text-center">{displayError}</p>
            </div>
          )}

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-200 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="admin@example.com"
                  disabled={isSubmitting || showSuccess}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary-200 mb-2">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  disabled={isSubmitting || showSuccess}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || showSuccess}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-700 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Вход...</span>
                </>
              ) : showSuccess ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Успешно!</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>{isMarketingPanel ? 'Войти в кабинет' : isSpecialistPanel ? 'Войти в кабинет' : 'Войти в админ-панель'}</span>
                </>
              )}
            </button>
          </form>

          {/* Разделитель */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-primary-200/60 text-sm">
              {isMarketingPanel
                ? 'Для доступа нужна роль маркетолога'
                : isSpecialistPanel
                  ? 'Для доступа нужны права специалиста'
                  : 'Для доступа требуются права администратора'}
            </p>
          </div>

          {/* Ссылка на главную */}
          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-primary-300 hover:text-white text-sm transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Вернуться на главную
            </a>
          </div>
        </div>

        {/* Подпись */}
        <p className="text-center text-primary-300/40 text-xs mt-6">
          Питомец+ © 2025 | Версия 0.4.0
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
