import React, { useState, useMemo } from 'react';

// Components
import TableHeader from './TableHeader';
import TableFilters from './TableFilters';
import TablePagination from './TablePagination';
import BulkActions from './BulkActions';
import ExportButton from '../Export/ExportButton';
import ExportModal from '../Export/ExportModal';
import RowActionsDropdown from './RowActionsDropdown';

// API
import { adminAPI } from '../../utils/api';
import { devLog } from '../../utils/logger';

const DataTable = ({
  title,
  columns,
  data,
  loading,
  error,
  pagination,
  filters,
  bulkActions,
  actions, // Действия с записями
  primaryActionKey, // Ключ действия для прямой кнопки (напр. 'edit')
  getDropdownActions, // (row) => [...] — действия для меню ⋮ (по статусу и т.п.)
  model, // Модель для экспорта
  onRefresh,
  onFilterChange,
  onSortChange,
  onPageChange,
  onBulkAction,
  onAction, // Новое свойство для обработки действий
  onCreate, // Новое свойство для создания
  createButtonText = 'Создать',
  emptyMessage = 'Нет данных для отображения',
  onResetFilters, // Новое свойство для сброса фильтров
  onShowSettings, // Новое свойство для отображения настроек
  currentFilters // Текущие примененные фильтры для экспорта
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [openActionsRowId, setOpenActionsRowId] = useState(null);

  // Обработка сортировки
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSortChange?.(key, direction);
  };

  // Обработка выбора строк
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(data.map(item => item.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const handleExport = async (exportParams) => {
    try {
      devLog.log('Starting export with params:', exportParams);

      // Если передан только формат (например, 'csv'), создаем параметры экспорта
      if (typeof exportParams === 'string') {
        exportParams = {
          format: exportParams,
          model: model,
          filters: JSON.stringify(currentFilters || {}),
          filename: `${model}_export_${new Date().toISOString().split('T')[0]}`
        };
      }

      devLog.log('Final export params:', exportParams);
      devLog.log('Current filters:', currentFilters);
      devLog.log('Model prop:', model);

      // Проверяем токен авторизации
      const token = localStorage.getItem('access_token');
      devLog.log('Auth token exists:', !!token);

      if (!token) {
        throw new Error('Пользователь не авторизован. Пожалуйста, войдите в систему.');
      }

      // Проверяем, что модель задана
      if (!exportParams.model) {
        throw new Error('Не указана модель для экспорта. Проверьте настройки таблицы.');
      }

      if (!token) {
        throw new Error('Пользователь не авторизован. Пожалуйста, войдите в систему.');
      }

      // Делаем API вызов для экспорта
      const apiParams = {
        model: exportParams.model || model,
        format: exportParams.format || 'csv',
        filters: exportParams.filters || JSON.stringify({}),
        filename: exportParams.filename
      };

      devLog.log('Making API call with params:', apiParams);

      const response = await adminAPI.management.exportData(apiParams);

      devLog.log('API response received:', response.status, response.headers);

      // Создаем blob из ответа
      const blob = new Blob([response.data], {
        type: exportParams.format === 'csv' ? 'text/csv' :
              exportParams.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              exportParams.format === 'pdf' ? 'application/pdf' :
              'application/json'
      });

      // Создаем URL для скачивания
      const url = window.URL.createObjectURL(blob);

      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = exportParams.filename || `export.${exportParams.format}`;

      // Добавляем ссылку в DOM, кликаем и удаляем
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Освобождаем URL
      window.URL.revokeObjectURL(url);

      devLog.log('Export completed successfully');
    } catch (error) {
      devLog.error('Export failed:', error);

      let errorMessage = 'Неизвестная ошибка экспорта';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.';
        } else if (status === 403) {
          errorMessage = 'Недостаточно прав для экспорта данных. Требуются права администратора.';
        } else if (status === 404) {
          errorMessage = 'Сервис экспорта не найден. Обратитесь к администратору системы.';
        } else if (status === 500) {
          errorMessage = 'Ошибка сервера при экспорте данных.';
        } else if (data?.error) {
          errorMessage = data.error;
        } else {
          errorMessage = `Ошибка сервера (${status}): ${error.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`Ошибка экспорта: ${errorMessage}`);
    }
  };

  // Вычисляемые значения
  const hasSelection = selectedRows.length > 0;
  const hasBulkActions = bulkActions && bulkActions.length > 0;
  const hasActions = (actions && actions.length > 0) || getDropdownActions;
  const primaryAction = primaryActionKey && actions
    ? actions.find(a => a.key === primaryActionKey)
    : null;
  const hasDropdown = getDropdownActions || (actions && actions.filter(a => a.key !== primaryActionKey).length > 0);

  // Колонка действий: ✏️ + ⋮ — всегда видна без прокрутки (вариант C)
  const tableColumns = useMemo(() => {
    const cols = [...columns];

    if (primaryAction || hasDropdown) {
      cols.unshift({
        key: '_row_actions',
        label: '',
        sortable: false,
        render: (_, row) => (
          <RowActionsDropdown
            row={row}
            primaryAction={primaryAction}
            dropdownActions={getDropdownActions || (() => (actions || []).filter(a => a.key !== primaryActionKey))}
            onAction={onAction}
            isOpen={openActionsRowId === (row.id ?? row.pk)}
            onOpenChange={setOpenActionsRowId}
          />
        )
      });
    }

    return cols;
  }, [columns, actions, primaryAction, primaryActionKey, getDropdownActions, hasDropdown, onAction, openActionsRowId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки данных</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Если есть ошибка, показываем её
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки данных</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Заголовок и действия */}
      <TableHeader
        title={title}
        totalCount={pagination?.count || data.length}
        selectedCount={selectedRows.length}
        onRefresh={onRefresh}
        hasBulkActions={hasBulkActions && hasSelection}
        model={model}
        onExport={(format) => {
          if (format) {
            // Прямой экспорт в указанном формате
            handleExport(format);
          } else {
            // Открываем модальное окно для настройки экспорта
            setExportModalOpen(true);
          }
        }}
        onCreate={onCreate}
        createButtonText={createButtonText}
        onResetFilters={onResetFilters}
        onShowSettings={onShowSettings}
      />

      {/* Фильтры */}
      {filters && (
        <TableFilters
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Массовые действия */}
      {hasBulkActions && hasSelection && (
        <BulkActions
          selectedCount={selectedRows.length}
          actions={bulkActions}
          onAction={onBulkAction}
          selectedIds={selectedRows}
        />
      )}

      {/* Таблица — min-w-0 для flex, overflow-x-auto для горизонтальной прокрутки */}
      <div className="overflow-x-auto min-w-0">
        <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 'max-content' }}>
          <thead className="bg-gray-50">
            <tr>
              {/* Чекбокс для выбора всех */}
              {hasBulkActions && (
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 sm:left-6"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}

              {/* Заголовки колонок */}
              {tableColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.key === '_row_actions' ? 'w-12 text-center' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumns.length + (hasBulkActions ? 1 : 0)}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                  <div className="text-4xl mb-2">📋</div>
                  <p>{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={row.id ?? row.pk ?? index} className="hover:bg-gray-50">
                  {/* Чекбокс для выбора строки */}
                  {hasBulkActions && (
                    <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 sm:left-6"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                      />
                    </td>
                  )}

                  {/* Данные строки */}
                  {tableColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                        column.key === '_row_actions' ? 'w-12 text-center' : ''
                      }`}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {pagination && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
        />
      )}

      {/* Модальное окно экспорта */}
      {model && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          model={model}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

export default DataTable;
