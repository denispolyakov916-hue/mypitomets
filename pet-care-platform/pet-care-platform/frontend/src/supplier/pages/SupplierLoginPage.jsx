import React, { useEffect, useState } from 'react';
import { LogIn, Store } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const SUPPLIER_ROLES = ['supplier_manager', 'supplier_editor', 'supplier_analyst', 'admin'];

const SupplierLoginPage = () => {
  const login = useAuthStore(s => s.login);
  const logout = useAuthStore(s => s.logout);
  const clearError = useAuthStore(s => s.clearError);
  const authError = useAuthStore(s => s.error);
  const authLoading = useAuthStore(s => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const submit = async (event) => {
    event.preventDefault();
    setLocalError('');
    clearError();
    if (!email.trim() || !password) {
      setLocalError('Введите email и пароль');
      return;
    }

    setSubmitting(true);
    try {
      const success = await login(email.trim(), password);
      if (!success) return;
      const currentUser = useAuthStore.getState().user;
      const hasSupplierRole = SUPPLIER_ROLES.includes(currentUser?.role) || currentUser?.is_staff || currentUser?.is_superuser;
      if (!hasSupplierRole) {
        await logout();
        setLocalError('Для входа нужен доступ поставщика');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const error = localError || authError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-600 text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Кабинет поставщика</h1>
            <p className="text-sm text-gray-500">Вход для Динозаврика и будущих поставщиков</p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="supplier@example.com"
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || authLoading}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Войти
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-sm text-gray-500">
          Доступ выдаётся в админке платформы в разделе “Поставщики”.
        </div>
      </div>
    </div>
  );
};

export default SupplierLoginPage;
