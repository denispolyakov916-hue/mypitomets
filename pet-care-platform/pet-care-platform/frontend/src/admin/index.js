// Основной экспорт для админ-приложения
export { default as AdminApp } from './App';

// Auth components
export { AdminLoginPage } from './components/Auth';

// Layout components
export { default as AdminLayout } from './components/Layout/AdminLayout';
export { default as Sidebar } from './components/Layout/Sidebar';
export { default as Header } from './components/Layout/Header';

// Dashboard components
export { default as Dashboard } from './components/Dashboard/Dashboard';
export { default as MetricCard } from './components/Dashboard/MetricCard';
export { default as QuickActions } from './components/Dashboard/QuickActions';
export { default as RecentOrders } from './components/Dashboard/RecentOrders';
export { default as TopProducts } from './components/Dashboard/TopProducts';
export { default as PetsBySpecies } from './components/Dashboard/PetsBySpecies';
export { default as RecentReviews } from './components/Dashboard/RecentReviews';

// Stores
export { adminStore, useAdminStore } from './stores/adminStore';

// Hooks
export { useDashboardData } from './hooks/useDashboardData';
export { useAdminAuth } from './hooks/useAdminAuth';

// Utils
export { adminAPI } from './utils/api';
