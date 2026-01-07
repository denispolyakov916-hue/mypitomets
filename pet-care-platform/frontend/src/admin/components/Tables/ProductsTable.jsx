import React, { useState, useEffect, useMemo } from 'react';

// Components
import DataTable from './DataTable';

// Hooks
import { adminAPI } from '../../utils/api';

const ProductsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    animal: '',
    category: '',
    in_stock: '',
    vendor: '',
    price_min: '',
    price_max: ''
  });

  // Загрузка данных
  const loadData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.products.list({
        ...filters,
        ...params,
        page: params.page || 1,
        page_size: params.page_size || 50
      });

      setData(response.data.results || response.data);
      setPagination(response.data.pagination || null);
      console.log('[ProductsTable] Data loaded from API');
    } catch (err) {
      console.error('Products load error:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки товаров');
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
  const handleBulkAction = async (action, selectedIds) => {
    try {
      const updates = {};

      if (action === 'activate') {
        updates.in_stock = true;
      } else if (action === 'deactivate') {
        updates.in_stock = false;
      } else if (action === 'apply_discount_10') {
        updates.discount_percent = 10;
      } else if (action === 'apply_discount_20') {
        updates.discount_percent = 20;
      } else if (action === 'remove_discount') {
        updates.discount_percent = 0;
      }

      await adminAPI.management.bulkUpdateProducts({
        product_ids: selectedIds,
        updates
      });

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
      key: 'name',
      label: 'Название',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 max-w-xs truncate" title={value}>
            {value}
          </div>
          <div className="text-sm text-gray-500">
            {row.vendor && `Бренд: ${row.vendor}`}
            {row.vendor_code && ` • Арт: ${row.vendor_code}`}
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Цена',
      sortable: true,
      render: (value, row) => {
        const originalPrice = value;
        const discountPercent = row.discount_percent || 0;
        const discountedPrice = discountPercent > 0
          ? originalPrice * (100 - discountPercent) / 100
          : originalPrice;

        return (
          <div>
            {discountPercent > 0 ? (
              <div>
                <div className="text-sm text-gray-500 line-through">
                  {originalPrice.toLocaleString()} ₽
                </div>
                <div className="font-medium text-green-600">
                  {discountedPrice.toLocaleString()} ₽
                </div>
                <div className="text-xs text-red-600">
                  -{discountPercent}%
                </div>
              </div>
            ) : (
              <div className="font-medium text-gray-900">
                {originalPrice.toLocaleString()} ₽
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'animal',
      label: 'Животное',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'dog' ? 'bg-blue-100 text-blue-800' :
          value === 'cat' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value === 'dog' ? '🐕 Собака' :
           value === 'cat' ? '🐈 Кошка' :
           value}
        </span>
      )
    },
    {
      key: 'category',
      label: 'Категория',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900">{value}</div>
          {row.subcategory && (
            <div className="text-xs text-gray-500">{row.subcategory}</div>
          )}
        </div>
      )
    },
    {
      key: 'stock_count',
      label: 'Наличие',
      sortable: true,
      render: (value, row) => (
        <div>
          {row.in_stock ? (
            <div>
              <span className={`text-sm font-medium ${
                value <= 5 ? 'text-red-600' : 'text-green-600'
              }`}>
                {value} шт.
              </span>
              {value <= 5 && (
                <div className="text-xs text-red-500">Мало!</div>
              )}
            </div>
          ) : (
            <span className="text-sm text-red-600 font-medium">Нет в наличии</span>
          )}
        </div>
      )
    },
    {
      key: 'order_count',
      label: 'Продажи',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value || 0}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Создан',
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
      placeholder: 'Название, бренд или артикул',
      value: filters.search,
      quick: true,
      quickLabel: 'Очистить',
      quickValue: ''
    },
    {
      key: 'animal',
      label: 'Животное',
      type: 'select',
      value: filters.animal,
      options: [
        { value: 'dog', label: '🐕 Собаки' },
        { value: 'cat', label: '🐈 Кошки' }
      ]
    },
    {
      key: 'category',
      label: 'Категория',
      type: 'select',
      value: filters.category,
      options: [
        { value: 'food', label: '🍖 Корм' },
        { value: 'pharmacy', label: '💊 Ветаптека' },
        { value: 'ammunition', label: '🦮 Амуниция' },
        { value: 'care', label: '🧽 Уход' },
        { value: 'transport', label: '🚗 Транспортировка' },
        { value: 'toys', label: '🧸 Игрушки' }
      ]
    },
    {
      key: 'in_stock',
      label: 'Наличие',
      type: 'select',
      value: filters.in_stock,
      options: [
        { value: 'true', label: 'В наличии' },
        { value: 'false', label: 'Нет в наличии' }
      ]
    },
    {
      key: 'price',
      label: 'Цена',
      type: 'range',
      value_min: filters.price_min,
      value_max: filters.price_max
    }
  ], [filters]);

  // Конфигурация массовых действий
  const bulkActions = useMemo(() => [
    {
      key: 'activate',
      label: 'В наличие',
      icon: '✅',
      variant: 'success'
    },
    {
      key: 'deactivate',
      label: 'Снять с продажи',
      icon: '🚫',
      variant: 'danger'
    },
    {
      key: 'apply_discount_10',
      label: 'Скидка 10%',
      icon: '🏷️',
      variant: 'warning'
    },
    {
      key: 'apply_discount_20',
      label: 'Скидка 20%',
      icon: '🏷️',
      variant: 'warning'
    },
    {
      key: 'remove_discount',
      label: 'Убрать скидку',
      icon: '❌',
      variant: 'danger'
    }
  ], []);

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      is_active: '',
      in_stock: '',
      price_min: '',
      price_max: ''
    });
  };

  // Обработчик показа настроек
  const handleShowSettings = () => {
    // В будущем можно добавить модальное окно с настройками отображения колонок
    alert('Настройки отображения таблиц будут доступны в следующих версиях');
  };

  return (
    <DataTable
      title="Управление товарами"
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
      emptyMessage="Товары не найдены"
      onResetFilters={handleResetFilters}
      onShowSettings={handleShowSettings}
      currentFilters={filters}
    />
  );
};

export default ProductsTable;
