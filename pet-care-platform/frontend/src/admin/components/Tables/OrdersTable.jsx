import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// Components
import DataTable from './DataTable';

// Hooks
import { adminAPI } from '../../utils/api';

const OrdersTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: searchParams.get('status') || '', // Читаем статус из URL
    user__email: '',
    created_at_after: '',
    created_at_before: '',
    total_amount_min: '',
    total_amount_max: ''
  });

  // Загрузка данных
  const loadData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.orders.list({
        ...filters,
        ...params,
        page: params.page || 1,
        page_size: params.page_size || 50
      });

      setData(response.data.results || response.data);
      setPagination(response.data.pagination || null);
      console.log('[OrdersTable] Data loaded from API');
    } catch (err) {
      console.error('Orders load error:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки заказов');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики
  const handleRefresh = () => loadData();
  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Обновляем URL при изменении статуса
      if (key === 'status') {
        if (value) {
          setSearchParams({ status: value }, { replace: true });
        } else {
          setSearchParams({}, { replace: true });
        }
      }
      return newFilters;
    });
  };
  const handleSortChange = (key, direction) => {
    loadData({ ordering: direction === 'desc' ? `-${key}` : key });
  };
  const handlePageChange = (page) => loadData({ page });
  const handleBulkAction = async (action, selectedIds) => {
    try {
      let status = '';
      if (action === 'mark_pending') status = 'pending';
      else if (action === 'mark_processing') status = 'processing';
      else if (action === 'mark_shipped') status = 'shipped';
      else if (action === 'mark_delivered') status = 'delivered';
      else if (action === 'cancel_orders') status = 'cancelled';

      if (status) {
        await adminAPI.management.bulkUpdateOrders({
          order_ids: selectedIds,
          status
        });
        await loadData(); // Перезагрузка данных
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setError('Ошибка выполнения массовой операции');
    }
  };

  // Синхронизация фильтра status с URL параметрами при монтировании
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && statusFromUrl !== filters.status) {
      setFilters(prev => ({ ...prev, status: statusFromUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускаем только при монтировании, читаем из URL

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
      key: 'id',
      label: 'ID заказа',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm font-medium text-primary-600">
          #{value?.slice(-8)}
        </span>
      )
    },
    {
      key: 'user',
      label: 'Покупатель',
      sortable: false,
        render: (value, row) => (
          <div>
            {row.user_email ? (
              <div>
                <div className="font-medium text-gray-900">{row.user_email}</div>
                <div className="text-sm text-gray-500">
                  ID: {row.user_id}
                </div>
              </div>
            ) : (
              <span className="text-gray-500">Анонимный</span>
            )}
          </div>
        )
    },
    {
      key: 'total_amount',
      label: 'Сумма',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900">
          {value?.toLocaleString()} ₽
        </span>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (value) => {
        const statusConfig = {
          pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
          processing: { label: 'В обработке', color: 'bg-primary-100 text-primary-800', icon: '🔄' },
          partially_delivered: { label: 'Частично доставлен', color: 'bg-primary-100 text-primary-800', icon: '📦' },
          shipped: { label: 'Отправлен', color: 'bg-primary-100 text-primary-800', icon: '🚚' },
          delivered: { label: 'Доставлен', color: 'bg-green-100 text-green-800', icon: '✅' },
          cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-800', icon: '❌' },
          expired: { label: 'Истёк', color: 'bg-gray-100 text-gray-800', icon: '⌛' }
        };

        const config = statusConfig[value] || statusConfig.pending;

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'delivery_type',
      label: 'Доставка',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value === 'pickup' ? 'Самовывоз' :
           value === 'standard' ? 'Стандарт' :
           value === 'express' ? 'Экспресс' :
           value || 'Не указан'}
        </span>
      )
    },
    {
      key: 'recipient_name',
      label: 'Получатель',
      sortable: false,
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900">{value || 'Не указан'}</div>
          {row.recipient_phone && (
            <div className="text-xs text-gray-500">{row.recipient_phone}</div>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Создан',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
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
      placeholder: 'ID заказа, email или имя',
      value: filters.search
    },
    {
      key: 'status',
      label: 'Статус',
      type: 'select',
      value: filters.status,
      options: [
        { value: 'pending', label: '⏳ Ожидает' },
        { value: 'processing', label: '🔄 В обработке' },
        { value: 'shipped', label: '🚚 Отправлен' },
        { value: 'delivered', label: '✅ Доставлен' },
        { value: 'cancelled', label: '❌ Отменён' },
        { value: 'expired', label: '⌛ Истёк' }
      ]
    },
    {
      key: 'delivery_type',
      label: 'Тип доставки',
      type: 'select',
      value: filters.delivery_type,
      options: [
        { value: 'standard', label: 'Стандартная' },
        { value: 'express', label: 'Экспресс' },
        { value: 'pickup', label: 'Самовывоз' }
      ]
    },
    {
      key: 'total_amount',
      label: 'Сумма заказа',
      type: 'range',
      value_min: filters.total_amount_min,
      value_max: filters.total_amount_max
    },
    {
      key: 'created_at_after',
      label: 'Дата создания с',
      type: 'date',
      value: filters.created_at_after
    },
    {
      key: 'created_at_before',
      label: 'Дата создания по',
      type: 'date',
      value: filters.created_at_before
    }
  ], [filters]);

  // Конфигурация массовых действий
  const bulkActions = useMemo(() => [
    {
      key: 'mark_processing',
      label: 'В обработку',
      icon: '🔄',
      variant: 'success'
    },
    {
      key: 'mark_shipped',
      label: 'Отправить',
      icon: '🚚',
      variant: 'warning'
    },
    {
      key: 'mark_delivered',
      label: 'Доставлен',
      icon: '✅',
      variant: 'success'
    },
    {
      key: 'cancel_orders',
      label: 'Отменить',
      icon: '❌',
      variant: 'danger'
    }
  ], []);

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      payment_status: '',
      total_min: '',
      total_max: '',
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
    <DataTable
      title="Управление заказами"
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      pagination={pagination}
      filters={filterConfig}
      bulkActions={bulkActions}
      onRefresh={handleRefresh}
      onFilterChange={handleFilterChange}
      onSortChange={handleSortChange}
      onPageChange={handlePageChange}
      onBulkAction={handleBulkAction}
      emptyMessage="Заказы не найдены"
      onResetFilters={handleResetFilters}
      onShowSettings={handleShowSettings}
      currentFilters={filters}
      model="orders"
    />
  );
};

export default OrdersTable;
