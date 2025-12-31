import React, { useState, useEffect, useMemo } from 'react';

// Components
import DataTable from './DataTable';

// Hooks
import { adminAPI } from '../../utils/api';

const PetsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    species: '',
    breed: '',
    gender: '',
    owner__email: '',
    created_at_after: '',
    created_at_before: ''
  });

  // Загрузка данных
  const loadData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.pets.list({
        ...filters,
        ...params,
        page: params.page || 1,
        page_size: params.page_size || 50
      });

      setData(response.data.results || response.data);
      setPagination(response.data.pagination || null);
      console.log('[PetsTable] Data loaded from API');
    } catch (err) {
      console.error('Pets load error:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки питомцев');
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
      // Пока заглушка - в будущем можно добавить массовые операции
      console.log('Bulk action:', action, 'for pets:', selectedIds);
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
      label: 'Кличка',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            ID: {row.id?.slice(-8)}
          </div>
        </div>
      )
    },
    {
      key: 'owner',
      label: 'Владелец',
      sortable: false,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.owner?.email || 'Не указан'}</div>
          {row.owner?.first_name && (
            <div className="text-sm text-gray-500">
              {row.owner.first_name} {row.owner.last_name || ''}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'species',
      label: 'Вид',
      sortable: true,
      render: (value) => {
        const speciesConfig = {
          dog: { label: 'Собака', icon: '🐕', color: 'bg-blue-100 text-blue-800' },
          cat: { label: 'Кошка', icon: '🐈', color: 'bg-orange-100 text-orange-800' },
          bird: { label: 'Птица', icon: '🐦', color: 'bg-yellow-100 text-yellow-800' },
          rodent: { label: 'Грызун', icon: '🐹', color: 'bg-green-100 text-green-800' },
          fish: { label: 'Рыбка', icon: '🐠', color: 'bg-cyan-100 text-cyan-800' },
          reptile: { label: 'Рептилия', icon: '🦎', color: 'bg-lime-100 text-lime-800' },
          other: { label: 'Другое', icon: '🐾', color: 'bg-gray-100 text-gray-800' }
        };

        const config = speciesConfig[value] || speciesConfig.other;

        return (
          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'breed',
      label: 'Порода',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value || 'Не указана'}
        </span>
      )
    },
    {
      key: 'gender',
      label: 'Пол',
      sortable: true,
      render: (value) => {
        const genderConfig = {
          male: { label: 'Самец', icon: '♂️', color: 'bg-blue-100 text-blue-800' },
          female: { label: 'Самка', icon: '♀️', color: 'bg-pink-100 text-pink-800' },
          unknown: { label: 'Не указан', icon: '❓', color: 'bg-gray-100 text-gray-800' }
        };

        const config = genderConfig[value] || genderConfig.unknown;

        return (
          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'date_of_birth',
      label: 'Возраст',
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;

        const birthDate = new Date(value);
        const today = new Date();
        const ageInMs = today - birthDate;
        const ageInYears = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
        const ageInMonths = Math.floor((ageInMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));

        let ageText = '';
        if (ageInYears > 0) {
          ageText = `${ageInYears} ${ageInYears === 1 ? 'год' : ageInYears < 5 ? 'года' : 'лет'}`;
          if (ageInMonths > 0) {
            ageText += ` ${ageInMonths} мес`;
          }
        } else if (ageInMonths > 0) {
          ageText = `${ageInMonths} мес`;
        } else {
          ageText = 'Менее месяца';
        }

        return (
          <div>
            <div className="text-sm text-gray-900">{ageText}</div>
            <div className="text-xs text-gray-500">
              {birthDate.toLocaleDateString('ru-RU')}
            </div>
          </div>
        );
      }
    },
    {
      key: 'weight',
      label: 'Вес',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value ? `${value} кг` : 'Не указан'}
        </span>
      )
    },
    {
      key: 'activity_level',
      label: 'Активность',
      sortable: true,
      render: (value) => {
        const activityConfig = {
          low: { label: 'Низкая', color: 'bg-gray-100 text-gray-800' },
          medium: { label: 'Средняя', color: 'bg-blue-100 text-blue-800' },
          high: { label: 'Высокая', color: 'bg-red-100 text-red-800' }
        };

        const config = activityConfig[value] || activityConfig.medium;

        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'health_issues',
      label: 'Здоровье',
      sortable: false,
      render: (value) => {
        if (!value || value.length === 0) {
          return <span className="text-green-600 text-sm">Здоров</span>;
        }

        return (
          <div>
            <span className="text-red-600 text-sm font-medium">
              {value.length} проблем{value.length !== 1 ? '' : 'а'}
            </span>
            <div className="text-xs text-gray-500 max-w-32 truncate" title={value.join(', ')}>
              {value.slice(0, 2).join(', ')}
              {value.length > 2 && '...'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Добавлен',
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
      placeholder: 'Кличка, ID или владелец',
      value: filters.search
    },
    {
      key: 'species',
      label: 'Вид животного',
      type: 'select',
      value: filters.species,
      options: [
        { value: 'dog', label: '🐕 Собаки' },
        { value: 'cat', label: '🐈 Кошки' },
        { value: 'bird', label: '🐦 Птицы' },
        { value: 'rodent', label: '🐹 Грызуны' },
        { value: 'fish', label: '🐠 Рыбки' },
        { value: 'reptile', label: '🦎 Рептилии' },
        { value: 'other', label: '🐾 Другие' }
      ]
    },
    {
      key: 'gender',
      label: 'Пол',
      type: 'select',
      value: filters.gender,
      options: [
        { value: 'male', label: '♂️ Самцы' },
        { value: 'female', label: '♀️ Самки' },
        { value: 'unknown', label: '❓ Не указан' }
      ]
    },
    {
      key: 'activity_level',
      label: 'Уровень активности',
      type: 'select',
      value: filters.activity_level,
      options: [
        { value: 'low', label: 'Низкий' },
        { value: 'medium', label: 'Средний' },
        { value: 'high', label: 'Высокий' }
      ]
    },
    {
      key: 'created_at_after',
      label: 'Добавлен с',
      type: 'date',
      value: filters.created_at_after
    },
    {
      key: 'created_at_before',
      label: 'Добавлен по',
      type: 'date',
      value: filters.created_at_before
    }
  ], [filters]);

  // Пока без массовых действий для питомцев
  const bulkActions = useMemo(() => [], []);

  return (
    <DataTable
      title="Управление питомцами"
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
      emptyMessage="Питомцы не найдены"
    />
  );
};

export default PetsTable;
