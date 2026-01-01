import React, { useState } from 'react';

const TableFilters = ({
  filters,
  onFilterChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key, value) => {
    onFilterChange?.(key, value);
  };

  const clearAllFilters = () => {
    filters.forEach(filter => {
      if (filter.type === 'select') {
        handleFilterChange(filter.key, '');
      } else if (filter.type === 'date') {
        handleFilterChange(filter.key, '');
      } else if (filter.type === 'range') {
        handleFilterChange(`${filter.key}_min`, '');
        handleFilterChange(`${filter.key}_max`, '');
      } else {
        handleFilterChange(filter.key, '');
      }
    });
  };

  const activeFiltersCount = filters.filter(filter => {
    if (filter.type === 'range') {
      return filter.value_min || filter.value_max;
    }
    return filter.value;
  }).length;

  return (
    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Кнопка показа/скрытия фильтров */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Фильтры
            {activeFiltersCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Очистить все фильтры */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Очистить все
            </button>
          )}
        </div>

        {/* Быстрые фильтры */}
        <div className="flex items-center space-x-2">
          {filters.filter(f => f.quick).map(filter => (
            <button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key, filter.quickValue)}
              className={`px-3 py-1 text-sm rounded-md border ${
                filter.value === filter.quickValue
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.quickLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Развернутые фильтры */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filters.map(filter => (
            <div key={filter.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {filter.label}
              </label>

              {filter.type === 'select' && (
                <select
                  value={filter.value || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Все</option>
                  {filter.options?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {filter.type === 'text' && (
                <input
                  type="text"
                  value={filter.value || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  placeholder={filter.placeholder}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              )}

              {filter.type === 'date' && (
                <input
                  type="date"
                  value={filter.value || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              )}

              {filter.type === 'range' && (
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={filter.value_min || ''}
                    onChange={(e) => handleFilterChange(`${filter.key}_min`, e.target.value)}
                    placeholder="От"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    value={filter.value_max || ''}
                    onChange={(e) => handleFilterChange(`${filter.key}_max`, e.target.value)}
                    placeholder="До"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              )}

              {filter.type === 'boolean' && (
                <select
                  value={filter.value || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Все</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableFilters;
