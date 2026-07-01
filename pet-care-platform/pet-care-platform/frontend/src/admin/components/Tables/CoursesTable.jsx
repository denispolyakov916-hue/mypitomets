import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Components
import DataTable from './DataTable';
import CreateCourseModal from '../Courses/CreateCourseModal';
import { ConfirmModal } from '../../../components/ui/Modal';

// Hooks
import { adminAPI } from '../../utils/api';
import { useAuthStore } from '../../../store/authStore';

const correctionProblemOptions = [
  { value: 'aggression_dogs', label: 'Агрессия к собакам' },
  { value: 'aggression_people', label: 'Агрессия к людям' },
  { value: 'aggression_cats', label: 'Агрессия к кошкам' },
  { value: 'separation_anxiety', label: 'Тревога разлуки' },
  { value: 'excessive_barking', label: 'Чрезмерный лай' },
  { value: 'destructive_behavior', label: 'Разрушительное поведение' },
  { value: 'fear_phobias', label: 'Страхи и фобии' },
  { value: 'marking_territory', label: 'Метки территории' },
  { value: 'excessive_licking', label: 'Чрезмерное вылизывание' },
  { value: 'food_aggression', label: 'Агрессия за еду' },
  { value: 'leash_pulling', label: 'Тянет поводок' },
  { value: 'jumping_on_people', label: 'Прыжки на людей' },
];

const CoursesTable = ({ panelBase = '/admin-panel', specialistMode = false }) => {
  const user = useAuthStore(s => s.user);
  const isCourseCreator = user?.role === 'course_creator';
  const routeBase = panelBase.replace(/\/$/, '');
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    course_type: specialistMode ? 'behavior_correction' : '',
    pet_type: '',
    category: '',
    level: '',
    risk_level: '',
    correction_problem: '',
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
        ...(specialistMode ? { course_type: 'behavior_correction' } : {}),
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

  const handleAction = useCallback(async (action, course) => {
    if (action === 'edit') {
      navigate(`${routeBase}/courses/${course.id}/edit`);
      return;
    }
    if (action === 'preview') {
      const url = `${window.location.origin}/training/courses/${course.id}/learn`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === 'duplicate') {
      try {
        setActionLoading(true);
        const { data: courseData } = await adminAPI.courses.retrieve(course.id);
        const copyPayload = {
          title: (courseData.title || 'Копия') + ' (копия)',
          description: courseData.description || '',
          duration: courseData.duration || 60,
          category: courseData.category || 'basics',
          level: courseData.level || 'beginner',
          pet_type: courseData.pet_type || 'all',
          course_type: courseData.course_type || 'general',
          format_type: courseData.format_type || 'video',
          price: courseData.price ?? 0,
          instructor_name: courseData.instructor_name || '',
          instructor_bio: courseData.instructor_bio || '',
          correction_problem: courseData.correction_problem || '',
          correction_problem_tags: courseData.correction_problem_tags || [],
          addresses_behavioral_problems: courseData.addresses_behavioral_problems || [],
          risk_level: courseData.risk_level || 'low',
          status: 'draft'
        };
        const { data: newCourse } = await adminAPI.courses.create(copyPayload);
        await loadData();
        navigate(`${routeBase}/courses/${newCourse.id}/edit`);
      } catch (err) {
        console.error('[CoursesTable] Duplicate error:', err);
        setError(err.response?.data?.error || 'Ошибка дублирования курса');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    if (action === 'publish') {
      try {
        setActionLoading(true);
        await adminAPI.courses.publish(course.id);
        await loadData();
      } catch (err) {
        console.error('[CoursesTable] Publish error:', err);
        setError(err.response?.data?.error || 'Ошибка публикации');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    if (action === 'unpublish') {
      try {
        setActionLoading(true);
        await adminAPI.courses.update(course.id, {
          status: 'draft',
          is_active: false
        });
        await loadData();
      } catch (err) {
        console.error('[CoursesTable] Unpublish error:', err);
        setError(err.response?.data?.error || 'Ошибка снятия с публикации');
      } finally {
        setActionLoading(false);
      }
      return;
    }
    if (action === 'delete') {
      setCourseToDelete(course);
      return;
    }
  }, [navigate, routeBase]);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleCourseCreated = (courseId) => {
    navigate(`${routeBase}/courses/${courseId}/edit`);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!courseToDelete) return;
    try {
      setActionLoading(true);
      await adminAPI.courses.delete(courseToDelete.id);
      setCourseToDelete(null);
      await loadData();
    } catch (err) {
      console.error('[CoursesTable] Delete error:', err);
      setError(err.response?.data?.error || 'Ошибка удаления курса');
    } finally {
      setActionLoading(false);
    }
  }, [courseToDelete]);



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
      key: 'author_email',
      label: 'Специалист',
      sortable: false,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value || 'Не назначен'}
        </span>
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
          value === 'dog' ? 'bg-primary-100 text-primary-800' :
          value === 'cat' ? 'bg-accent-100 text-accent-800' :
          'bg-primary-100 text-primary-800'
        }`}>
          {value === 'dog' ? '🐕 Собаки' :
           value === 'cat' ? '🐈 Кошки' :
           '🐾 Все'}
        </span>
      )
    },
    {
      key: 'course_type',
      label: 'Тип',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'behavior_correction'
            ? 'bg-purple-100 text-purple-800'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {value === 'behavior_correction' ? 'Коррекция' : 'Обычный'}
        </span>
      )
    },
    {
      key: 'risk_level',
      label: 'Риск',
      sortable: true,
      render: (value, row) => {
        if (row.course_type !== 'behavior_correction') return <span className="text-gray-400">-</span>
        const cfg = {
          low: { label: 'Низкий', cls: 'bg-green-100 text-green-800' },
          medium: { label: 'Средний', cls: 'bg-yellow-100 text-yellow-800' },
          high: { label: 'Высокий', cls: 'bg-red-100 text-red-800' },
        }
        const c = cfg[value] || cfg.low
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.cls}`}>
            {c.label}
          </span>
        )
      }
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
          intermediate: { label: 'Средний', color: 'bg-primary-100 text-primary-800' },
          advanced: { label: 'Продвинутый', color: 'bg-accent-100 text-accent-800' },
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
      key: 'course_type',
      label: 'Тип курса',
      type: 'select',
      value: filters.course_type,
      options: [
        { value: 'general', label: 'Обычные' },
        { value: 'behavior_correction', label: 'Коррекция поведения' }
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
      key: 'risk_level',
      label: 'Риск',
      type: 'select',
      value: filters.risk_level,
      options: [
        { value: 'low', label: 'Низкий' },
        { value: 'medium', label: 'Средний' },
        { value: 'high', label: 'Высокий' }
      ]
    },
    {
      key: 'correction_problem',
      label: 'Проблема коррекции',
      type: 'select',
      value: filters.correction_problem,
      options: correctionProblemOptions
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
  ].filter(filter => !(specialistMode && filter.key === 'course_type')), [filters, specialistMode]);

  // Конфигурация массовых действий
  const bulkActions = useMemo(() => {
    if (isCourseCreator || specialistMode) return [];

    return [
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
    ];
  }, [isCourseCreator, specialistMode]);

  // Конфигурация действий: primaryActionKey + getDropdownActions
  const rowActions = useMemo(() => [
    { key: 'edit', label: 'Редактировать', icon: '✏️', variant: 'primary' }
  ], []);

  const getDropdownActions = useCallback((row) => {
    const actions = [
      { key: 'preview', label: 'Предпросмотр', icon: '👁', variant: 'primary' },
      { key: 'duplicate', label: 'Дублировать', icon: '📋', variant: 'primary' },
    ];

    if (!isCourseCreator && !specialistMode) {
      const statusAction = row.status === 'published'
        ? { key: 'unpublish', label: 'Снять с публикации', icon: '📤', variant: 'warning' }
        : { key: 'publish', label: 'Опубликовать', icon: '✅', variant: 'success' };
      actions.push(statusAction);
      actions.push({ key: 'delete', label: 'Удалить', icon: '🗑', variant: 'danger' });
    }

    return actions;
  }, [isCourseCreator, specialistMode]);

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      search: '',
      course_type: specialistMode ? 'behavior_correction' : '',
      pet_type: '',
      category: '',
      level: '',
      risk_level: '',
      correction_problem: '',
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
      title={specialistMode ? 'Мои курсы коррекции' : 'Управление курсами'}
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      pagination={pagination}
      filters={filterConfig}
      bulkActions={bulkActions}
      actions={rowActions}
      primaryActionKey="edit"
      getDropdownActions={getDropdownActions}
      onRefresh={handleRefresh}
      onFilterChange={handleFilterChange}
      onSortChange={handleSortChange}
      onPageChange={handlePageChange}
      onBulkAction={handleBulkAction}
      onAction={handleAction}
      onCreate={specialistMode ? undefined : handleCreate}
      createButtonText="Создать курс"
      emptyMessage={specialistMode ? 'Назначенные курсы не найдены' : 'Курсы не найдены'}
      onResetFilters={handleResetFilters}
      onShowSettings={handleShowSettings}
      currentFilters={filters}
      model="courses"
    />

    <CreateCourseModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onCreated={handleCourseCreated}
      defaultCourseType={specialistMode ? 'behavior_correction' : 'general'}
      lockCourseType={specialistMode}
    />

    <ConfirmModal
      isOpen={!!courseToDelete}
      onClose={() => setCourseToDelete(null)}
      title="Удалить курс?"
      message={courseToDelete
        ? `Курс «${courseToDelete.title}» будет удалён. Это действие нельзя отменить.`
        : ''}
      confirmText="Удалить"
      cancelText="Отмена"
      onConfirm={handleDeleteConfirm}
      variant="danger"
    />
    </>
  );
};

export default CoursesTable;
