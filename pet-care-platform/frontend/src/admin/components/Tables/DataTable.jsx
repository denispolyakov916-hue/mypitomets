import React, { useState, useMemo } from 'react';

// Components
import TableHeader from './TableHeader';
import TableFilters from './TableFilters';
import TablePagination from './TablePagination';
import BulkActions from './BulkActions';
import ExportButton from '../Export/ExportButton';
import ExportModal from '../Export/ExportModal';

const DataTable = ({
  title,
  columns,
  data,
  loading,
  error,
  pagination,
  filters,
  bulkActions,
  actions, // Новое свойство для действий с записями
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
  onShowSettings // Новое свойство для отображения настроек
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [exportModalOpen, setExportModalOpen] = useState(false);

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

  const handleExport = (exportParams) => {
    // Логика экспорта будет реализована через API
    console.log('Export params:', exportParams);
  };

  // Вычисляемые значения
  const hasSelection = selectedRows.length > 0;
  const hasBulkActions = bulkActions && bulkActions.length > 0;
  const hasActions = actions && actions.length > 0;

  // Добавляем колонку действий если actions переданы
  const tableColumns = useMemo(() => {
    const cols = [...columns];

    if (hasActions) {
      cols.push({
        key: 'actions',
        label: 'Действия',
        sortable: false,
        render: (value, row) => (
          <div className="flex items-center space-x-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onAction?.(action.key, row)}
                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                  action.variant === 'danger'
                    ? 'text-red-700 bg-red-100 hover:bg-red-200'
                    : action.variant === 'warning'
                    ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                    : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                }`}
                title={action.label}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )
      });
    }

    return cols;
  }, [columns, actions, hasActions, onAction]);

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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
        onExport={() => setExportModalOpen(true)}
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

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Чекбокс для выбора всех */}
              {hasBulkActions && (
                <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:left-6"
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
                  }`}
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
                <tr key={row.id || index} className="hover:bg-gray-50">
                  {/* Чекбокс для выбора строки */}
                  {hasBulkActions && (
                    <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:left-6"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                      />
                    </td>
                  )}

                  {/* Данные строки */}
                  {tableColumns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
