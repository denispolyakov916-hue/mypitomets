import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import DataTable from './DataTable';
import CreateCourseModal from '../Courses/CreateCourseModal';

// Hooks
import { adminAPI } from '../../utils/api';

const CoursesTable = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    pet_type: '',
    category: '',
    level: '',
    is_active: '',
    is_free: '',
    price_min: '',
    price_max: ''
  });


  // Загрузка данных
  const loadData = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('[CoursesTable] Loading data with filters:', filters);

      const response = await adminAPI.courses.list({
        ...filters,
        ...params,
        page: params.page || 1,
        page_size: params.page_size || 50
      });

      console.log('[CoursesTable] Response received:', response);

      setData(response.data.results || response.data);
      setPagination(response.data.pagination || null);
      console.log('[CoursesTable] Data loaded successfully');
    } catch (err) {
      console.error('[CoursesTable] Load error:', err);
      console.error('[CoursesTable] Error response:', err.response);
      setError(err.response?.data?.detail || err.message || 'Ошибка загрузки курсов');
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

  const handleAction = (action, course) => {
    if (action === 'edit') {
      navigate(`/admin-panel/courses/${course.id}/edit`);
    }
  };

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleCourseCreated = (courseId) => {
    navigate(`/admin-panel/courses/${courseId}/edit`);
  };



  const handleBulkAction = async (action, selectedIds) => {
    try {
      const updates = {};

      if (action === 'activate') {
        updates.is_active = true;
      } else if (action === 'deactivate') {
        updates.is_active = false;
      } else if (action === 'make_free') {
        updates.price = 0;
      } else if (action === 'make_paid') {
        updates.price = 999; // Значение по умолчанию
      }

      await adminAPI.management.bulkUpdateCourses({
        course_ids: selectedIds,
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
      key: 'title',
      label: 'Название курса',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 max-w-xs truncate" title={value}>
            {value}
          </div>
          <div className="text-sm text-gray-500">
            {row.description && row.description.length > 50
              ? `${row.description.substring(0, 50)}...`
              : row.description || 'Без описания'
            }
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Цена',
      sortable: true,
      render: (value, row) => {
        if (row.is_free) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Бесплатно
            </span>
          );
        }
        return (
          <span className="font-medium text-gray-900">
            {value?.toLocaleString()} ₽
          </span>
        );
      }
    },
    {
      key: 'pet_type',
      label: 'Для животных',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'dog' ? 'bg-blue-100 text-blue-800' :
          value === 'cat' ? 'bg-orange-100 text-orange-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {value === 'dog' ? '🐕 Собаки' :
           value === 'cat' ? '🐈 Кошки' :
           '🐾 Все'}
        </span>
      )
    },
    {
      key: 'category',
      label: 'Категория',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{value}</span>
      )
    },
    {
      key: 'level',
      label: 'Уровень',
      sortable: true,
      render: (value) => {
        const levelConfig = {
          beginner: { label: 'Начинающий', color: 'bg-green-100 text-green-800' },
          intermediate: { label: 'Средний', color: 'bg-blue-100 text-blue-800' },
          advanced: { label: 'Продвинутый', color: 'bg-orange-100 text-orange-800' },
          expert: { label: 'Эксперт', color: 'bg-red-100 text-red-800' }
        };

        const config = levelConfig[value] || levelConfig.beginner;

        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'students',
      label: 'Студентов',
      sortable: true,
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value || 0}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Статус',
      sortable: true,
      render: (value) => {
        const cfg = {
          draft: { label: 'Черновик', cls: 'bg-yellow-100 text-yellow-800' },
          published: { label: 'Опубликован', cls: 'bg-green-100 text-green-800' },
          archived: { label: 'Архив', cls: 'bg-gray-100 text-gray-600' },
        }
        const c = cfg[value] || cfg.draft
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.cls}`}>
            {c.label}
          </span>
        )
      }
    },
    {
      key: 'duration',
      label: 'Длительность',
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;

        const hours = Math.floor(value / 60);
        const minutes = value % 60;

        if (hours > 0) {
          return <span className="text-sm text-gray-600">{hours}ч {minutes}мин</span>;
        }
        return <span className="text-sm text-gray-600">{minutes} мин</span>;
      }
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
      placeholder: 'Название курса',
      value: filters.search
    },
    {
      key: 'pet_type',
      label: 'Для животных',
      type: 'select',
      value: filters.pet_type,
      options: [
        { value: 'dog', label: '🐕 Собаки' },
        { value: 'cat', label: '🐈 Кошки' },
        { value: 'all', label: '🐾 Все' }
      ]
    },
    {
      key: 'category',
      label: 'Категория',
      type: 'select',
      value: filters.category,
      options: [
        { value: 'basics', label: 'Основы' },
        { value: 'training', label: 'Дрессировка' },
        { value: 'care', label: 'Уход' },
        { value: 'health', label: 'Здоровье' },
        { value: 'nutrition', label: 'Питание' },
        { value: 'behavior', label: 'Поведение' },
        { value: 'specialized', label: 'Специализированные' },
        { value: 'entertainment', label: 'Развлечения' }
      ]
    },
    {
      key: 'level',
      label: 'Уровень',
      type: 'select',
      value: filters.level,
      options: [
        { value: 'beginner', label: 'Начинающий' },
        { value: 'intermediate', label: 'Средний' },
        { value: 'advanced', label: 'Продвинутый' },
        { value: 'expert', label: 'Эксперт' }
      ]
    },
    {
      key: 'is_active',
      label: 'Статус',
      type: 'select',
      value: filters.is_active,
      options: [
        { value: 'true', label: 'Активные' },
        { value: 'false', label: 'Неактивные' }
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
      label: 'Активировать',
      icon: '✅',
      variant: 'success'
    },
    {
      key: 'deactivate',
      label: 'Деактивировать',
      icon: '🚫',
      variant: 'danger'
    },
    {
      key: 'make_free',
      label: 'Сделать бесплатными',
      icon: '🎁',
      variant: 'success'
    },
    {
      key: 'make_paid',
      label: 'Сделать платными',
      icon: '💰',
      variant: 'warning'
    }
  ], []);

  // Конфигурация действий с записями
  const rowActions = useMemo(() => [
    {
      key: 'edit',
      label: 'Редактировать',
      icon: '✏️',
      variant: 'primary'
    }
  ], []);

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      search: '',
      pet_type: '',
      category: '',
      level: '',
      is_active: '',
      is_free: '',
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
    <>
    <DataTable
      title="Управление курсами"
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      pagination={pagination}
      filters={filterConfig}
      bulkActions={bulkActions}
      actions={rowActions}
      onRefresh={handleRefresh}
      onFilterChange={handleFilterChange}
      onSortChange={handleSortChange}
      onPageChange={handlePageChange}
      onBulkAction={handleBulkAction}
      onAction={handleAction}
      onCreate={handleCreate}
      createButtonText="Создать курс"
      emptyMessage="Курсы не найдены"
      onResetFilters={handleResetFilters}
      onShowSettings={handleShowSettings}
      currentFilters={filters}
      model="courses"
    />

    <CreateCourseModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onCreated={handleCourseCreated}
    />
    </>
  );
};

export default CoursesTable;
