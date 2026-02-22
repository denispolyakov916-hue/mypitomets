import React, { useState, useEffect, useMemo } from 'react';

// Components
import DataTable from './DataTable';
import UserForm from '../Forms/UserForm';

// Hooks
import { adminAPI } from '../../utils/api';

const UsersTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    is_active: '',
    role: '',
    created_at_after: '',
    created_at_before: ''
  });

  // Модальное окно
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Загрузка данных
  const loadData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.users.list({
        ...filters,
        ...params,
        page: params.page || 1,
        page_size: params.page_size || 50
      });

      setData(response.data.results || response.data);
      setPagination(response.data.pagination || null);
      console.log('[UsersTable] Data loaded from API');
    } catch (err) {
      console.error('Users load error:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки пользователей');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики
  const handleRefresh = () => loadData();
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  const handleSortChange = (key, direction) => {
    loadData({ ordering: direction === 'desc' ? `-${key}` : key });
  };
  const handlePageChange = (page) => loadData({ page });

  // Обработчик действий с записями
  const handleAction = (action, user) => {
    if (action === 'edit') {
      setSelectedUser(user);
      setModalOpen(true);
    }
  };

  const handleBulkAction = async (action, selectedIds) => {
    try {
      if (action === 'activate') {
        await adminAPI.management.bulkUpdateUsers({ user_ids: selectedIds, updates: { is_active: true } });
      } else if (action === 'deactivate') {
        await adminAPI.management.bulkUpdateUsers({ user_ids: selectedIds, updates: { is_active: false } });
      } else if (action === 'make_staff') {
        await adminAPI.management.bulkUpdateUsers({ user_ids: selectedIds, updates: { role: 'admin' } });
      }
      await loadData(); // Перезагрузка данных
    } catch (err) {
      console.error('Bulk action error:', err);
      setError('Ошибка выполнения массовой операции');
    }
  };

  // Эффект для загрузки данных при изменении фильтров
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Конфигурация колонок
  const columns = useMemo(() => [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            {row.first_name || row.last_name ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : 'Без имени'}
          </div>
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Статус',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Активен' : 'Заблокирован'}
        </span>
      )
    },
    {
      key: 'role',
      label: 'Роль',
      sortable: true,
      render: (value) => {
        const cfg = {
          admin: { label: 'Администратор', cls: 'bg-primary-100 text-primary-800' },
          course_creator: { label: 'Создатель курсов', cls: 'bg-blue-100 text-blue-800' },
          user: { label: 'Пользователь', cls: 'bg-gray-100 text-gray-800' },
        };
        const c = cfg[value] || cfg.user;
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.cls}`}>
            {c.label}
          </span>
        );
      }
    },
    {
      key: 'pets_count',
      label: 'Питомцы',
      sortable: false,
      render: (value) => (
        <span className="text-sm text-gray-900 font-medium">
          {value || 0}
        </span>
      )
    },
    {
      key: 'orders_count',
      label: 'Заказы',
      sortable: false,
      render: (value) => (
        <span className="text-sm text-gray-900 font-medium">
          {value || 0}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Регистрация',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString('ru-RU')}
        </span>
      )
    }
  ], []);

  // Конфигурация фильтров
  const filterConfig = useMemo(() => [
    {
      key: 'search',
      label: 'Поиск',
      type: 'text',
      placeholder: 'Email, имя или телефон',
      value: filters.search
    },
    {
      key: 'is_active',
      label: 'Статус',
      type: 'select',
      value: filters.is_active,
      options: [
        { value: 'true', label: 'Активные' },
        { value: 'false', label: 'Заблокированные' }
      ]
    },
    {
      key: 'role',
      label: 'Роль',
      type: 'select',
      value: filters.role,
      options: [
        { value: 'admin', label: 'Администраторы' },
        { value: 'course_creator', label: 'Создатели курсов' },
        { value: 'user', label: 'Пользователи' }
      ]
    },
    {
      key: 'created_at_after',
      label: 'Регистрация с',
      type: 'date',
      value: filters.created_at_after
    },
    {
      key: 'created_at_before',
      label: 'Регистрация по',
      type: 'date',
      value: filters.created_at_before
    }
  ], [filters]);

  // Конфигурация действий с записями
  const rowActions = useMemo(() => [
    {
      key: 'edit',
      label: 'Редактировать',
      icon: '✏️',
      variant: 'primary'
    }
  ], []);

  // Конфигурация массовых действий
  const bulkActions = useMemo(() => [
    {
      key: 'activate',
      label: 'Активировать',
      icon: '✅',
      variant: 'success'
    },
    {
      key: 'deactivate',
      label: 'Заблокировать',
      icon: '🚫',
      variant: 'danger'
    },
    {
      key: 'make_staff',
      label: 'Назначить администратором',
      icon: '👑',
      variant: 'warning'
    }
  ], []);

  // Обработчик успешного сохранения
  const handleFormSuccess = () => {
    loadData(); // Перезагрузка данных
    setModalOpen(false);
    setSelectedUser(null);
  };

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      search: '',
      is_active: '',
      role: '',
      created_at_after: '',
      created_at_before: ''
    });
  };

  // Обработчик показа настроек
  const handleShowSettings = () => {
    // В будущем можно добавить модальное окно с настройками отображения колонок
    alert('Настройки отображения таблиц будут доступны в следующих версиях');
  };

  return (
    <>
      <DataTable
        title="Управление пользователями"
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        pagination={pagination}
        filters={filterConfig}
        actions={rowActions}
        bulkActions={bulkActions}
        model="users"
        onRefresh={handleRefresh}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onAction={handleAction}
        onBulkAction={handleBulkAction}
        emptyMessage="Пользователи не найдены"
        onResetFilters={handleResetFilters}
        onShowSettings={handleShowSettings}
        currentFilters={filters}
      />

      {/* Модальное окно формы */}
      <UserForm
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};

export default UsersTable;
