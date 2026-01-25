import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

/**
 * Страница подтверждения восстановления пароля
 */
/**
 * Валидация сложности пароля
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Минимум 8 символов');
  }
  
  // Проверка букв (латиница или кириллица)
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password)) {
    errors.push('Хотя бы одна буква');
  }
  
  // Проверка цифр
  if (!/\d/.test(password)) {
    errors.push('Хотя бы одна цифра');
  }
  
  // Проверка спецсимволов
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Хотя бы один спецсимвол (!@#$%...)');
  }
  
  return errors;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    code: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Валидация пароля в реальном времени
    if (name === 'new_password') {
      setPasswordErrors(validatePassword(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Проверка совпадения паролей
    if (formData.new_password !== formData.new_password_confirm) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    // Проверка требований к паролю
    const pwdErrors = validatePassword(formData.new_password);
    if (pwdErrors.length > 0) {
      setError('Пароль не соответствует требованиям: ' + pwdErrors.join(', '));
      setLoading(false);
      return;
    }

    try {
      console.log('[ResetPassword] Отправка данных:', formData);
      const response = await api.post('/auth/password-reset/confirm/', formData);
      console.log('[ResetPassword] Ответ:', response);
      
      // api.post возвращает response.data напрямую (см. api/client.js интерцептор)
      // Если получили токены, автоматически входим
      if (response.accessToken) {
        setAuth(response.user, response.accessToken);
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error('[ResetPassword] Ошибка:', err);
      // Извлекаем сообщение об ошибке из разных форматов ответа
      let errorMessage = 'Неверный код или произошла ошибка';
      if (err.errors) {
        // Если ошибки валидации от сервера
        const serverErrors = Object.values(err.errors).flat();
        if (serverErrors.length > 0) {
          errorMessage = serverErrors.join(', ');
        }
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Пароль изменён!</h2>
          <p className="text-gray-600">
            Ваш пароль успешно обновлён. Переходим в личный кабинет...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Новый пароль</h1>
          <p className="text-gray-600">
            Введите код из письма и придумайте новый пароль
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Код из письма
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
              Новый пароль
            </label>
            <input
              type="password"
              id="new_password"
              name="new_password"
              value={formData.new_password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Минимум 8 символов"
            />
            {/* Индикатор требований к паролю */}
            {formData.new_password && (
              <div className="mt-2 text-xs space-y-1">
                <div className={`flex items-center ${formData.new_password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-1">{formData.new_password.length >= 8 ? '✓' : '○'}</span>
                  Минимум 8 символов
                </div>
                <div className={`flex items-center ${/[a-zA-Zа-яА-ЯёЁ]/.test(formData.new_password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-1">{/[a-zA-Zа-яА-ЯёЁ]/.test(formData.new_password) ? '✓' : '○'}</span>
                  Хотя бы одна буква
                </div>
                <div className={`flex items-center ${/\d/.test(formData.new_password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-1">{/\d/.test(formData.new_password) ? '✓' : '○'}</span>
                  Хотя бы одна цифра
                </div>
                <div className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formData.new_password) ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-1">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formData.new_password) ? '✓' : '○'}</span>
                  Хотя бы один спецсимвол
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="new_password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <input
              type="password"
              id="new_password_confirm"
              name="new_password_confirm"
              value={formData.new_password_confirm}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Повторите пароль"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Сохранение...
              </>
            ) : (
              'Сохранить новый пароль'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link to="/forgot-password" className="block text-blue-600 hover:text-blue-800 text-sm">
            Не получили код? Запросить повторно
          </Link>
          <Link to="/login" className="block text-gray-500 hover:text-gray-700 text-sm">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

