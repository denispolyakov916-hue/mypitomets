import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import SupplierLoginPage from '../supplier/pages/SupplierLoginPage';

const SUPPLIER_ROLES = ['supplier_manager', 'supplier_editor', 'supplier_analyst', 'admin'];

const SupplierRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const loadProfile = useAuthStore(s => s.loadProfile);
  const [checking, setChecking] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (isAuthenticated && !user && !loadedRef.current) {
        loadedRef.current = true;
        try {
          await loadProfile();
        } catch {
          loadedRef.current = false;
        }
      }
      if (mounted) setChecking(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SupplierLoginPage />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Загрузка профиля...
      </div>
    );
  }

  if (!SUPPLIER_ROLES.includes(user.role) && !user.is_staff && !user.is_superuser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-lg border border-white/10 bg-white p-6 text-center shadow-xl">
          <h1 className="text-xl font-semibold text-gray-900">
            У вас нет доступа к панели поставщика
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Чтобы получить доступ к кабинету поставщика корма, отправьте заявку —
            её рассмотрит администратор платформы.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a
              href="/partner-access?role=supplier"
              className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Запросить доступ
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              На главную
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default SupplierRoute;
