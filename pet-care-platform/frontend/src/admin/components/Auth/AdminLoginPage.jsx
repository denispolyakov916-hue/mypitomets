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
const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Stores
  const { login, isAuthenticated, user, isLoading: authLoading, error: authError, clearError } = useAuthStore();
  const { setUser, checkAuth } = useAdminStore();
  
  // Local state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Получаем URL для редиректа после входа
  const from = location.state?.from?.pathname || '/admin-panel/dashboard';
  const redirectMessage = location.state?.message || '';

  // Очистка ошибок при монтировании
  useEffect(() => {
    clearError();
    setLocalError('');
  }, [clearError]);

  // Если уже авторизован как админ - редирект
  useEffect(() => {
    if (isAuthenticated && (user?.is_staff || user?.role === 'course_creator')) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

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
    
    console.log('[AdminLogin] Form submitted', { email, hasPassword: !!password });
    setLocalError('');
    clearError();
    
    // Валидация формы
    if (!validateForm()) {
      console.log('[AdminLogin] Validation failed');
      return;
    }
    
    // Предотвращаем повторную отправку
    if (isSubmitting || showSuccess) {
      console.log('[AdminLogin] Already submitting or success');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('[AdminLogin] Calling login API...');
      const success = await login(email.trim(), password);
      console.log('[AdminLogin] Login API result:', success);
      
      if (!success) {
        // Ошибка уже установлена в authStore через set({ error: ... })
        console.log('[AdminLogin] Login failed - check authStore error');
        setIsSubmitting(false);
        return;
      }
      
      // Получаем обновлённого пользователя из store
      const currentUser = useAuthStore.getState().user;
      console.log('[AdminLogin] Current user from store:', currentUser);
      
      if (!currentUser) {
        console.error('[AdminLogin] User is null after successful login');
        setLocalError('Не удалось получить данные пользователя');
        setIsSubmitting(false);
        return;
      }
      
      // Проверяем права: администратор или создатель курсов
      if (!currentUser.is_staff && !currentUser.is_superuser && currentUser.role !== 'course_creator') {
        console.log('[AdminLogin] User is not staff');
        setLocalError('У вас нет прав для доступа к админ-панели. Обратитесь к администратору системы.');
        // Выходим, так как обычный пользователь не должен оставаться залогиненным в админке
        await useAuthStore.getState().logout();
        setIsSubmitting(false);
        return;
      }
      
      console.log('[AdminLogin] User has admin rights, setting in adminStore');
      // Устанавливаем пользователя в adminStore
      setUser(currentUser);
      
      // Проверяем доступ к админ API
      console.log('[AdminLogin] Checking admin API access...');
      const hasAccess = await checkAuth();
      console.log('[AdminLogin] Admin API check result:', hasAccess);
      
      if (hasAccess) {
        console.log('[AdminLogin] Access granted, redirecting...');
        setShowSuccess(true);
        // Небольшая задержка для показа success состояния
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 500);
      } else {
        console.log('[AdminLogin] Admin API access denied');
        setLocalError('Не удалось получить доступ к админ-панели. Попробуйте позже.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('[AdminLogin] Unexpected error:', error);
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
      console.log('[AdminLogin] Auth error from store:', authError);
    }
  }, [authError, localError, isSubmitting]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Декоративные элементы фона */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      {/* Форма входа */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Карточка формы */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            {/* Логотип/Иконка */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Админ-панель</h1>
            <p className="text-blue-200 text-sm">Питомец+ | Система управления</p>
          </div>

          {/* Сообщение о редиректе */}
          {redirectMessage && (
            <div className="mb-6 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <p className="text-blue-200 text-sm text-center">{redirectMessage}</p>
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
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || showSuccess}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
                  <span>Войти в админ-панель</span>
                </>
              )}
            </button>
          </form>

          {/* Разделитель */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-blue-200/60 text-sm">
              Для доступа требуются права администратора
            </p>
          </div>

          {/* Ссылка на главную */}
          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-blue-300 hover:text-white text-sm transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Вернуться на главную
            </a>
          </div>
        </div>

        {/* Подпись */}
        <p className="text-center text-blue-300/40 text-xs mt-6">
          Питомец+ © 2025 | Версия 0.4.0
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;

