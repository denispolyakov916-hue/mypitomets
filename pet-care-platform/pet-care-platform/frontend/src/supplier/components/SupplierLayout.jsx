import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Boxes,
  LogOut,
  Menu,
  PackageCheck,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { name: 'Ассортимент', href: '/supplier-panel/products', icon: Boxes },
];

const SidebarContent = ({ onNavigate }) => {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        <PackageCheck className="h-6 w-6 text-primary-600" />
        <div className="ml-3">
          <div className="text-sm font-semibold text-gray-900">Кабинет поставщика</div>
          <div className="text-xs text-gray-500">Динозаврик</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const current = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                current
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <Link to="/admin-panel/dashboard" className="text-xs text-gray-500 hover:text-gray-900">
          Перейти в админку платформы
        </Link>
      </div>
    </div>
  );
};

const SupplierLayout = ({ children }) => {
  const [open, setOpen] = useState(false);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/supplier-panel', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/40"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[min(18rem,calc(100vw-2rem))] shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-md p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 min-w-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              className="mr-2 flex-shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:mr-3 lg:hidden"
              aria-label="Открыть меню"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900">Поставщик</div>
              <div className="hidden truncate text-xs text-gray-500 sm:block">Ассортимент и заявки Динозаврика</div>
            </div>
          </div>
          <div className="flex min-w-0 flex-shrink items-center gap-2 sm:gap-3">
            <div className="min-w-0 text-right">
              <div className="max-w-[8.5rem] truncate text-xs font-medium text-gray-900 sm:max-w-56 sm:text-sm">{user?.email}</div>
              <div className="hidden truncate text-xs text-gray-500 sm:block">{user?.role}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex flex-shrink-0 items-center rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:px-2.5"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Выйти</span>
              <span className="sm:hidden">Выход</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default SupplierLayout;
