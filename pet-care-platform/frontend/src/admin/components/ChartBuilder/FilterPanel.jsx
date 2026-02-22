import React, { useState, useEffect } from 'react';

const FilterPanel = ({ filters, onChange }) => {
  const [filterValues, setFilterValues] = useState(filters || {});
  const [expandedSections, setExpandedSections] = useState({
    date: true,
    categories: false,
    metrics: false
  });

  useEffect(() => {
    setFilterValues(filters || {});
  }, [filters]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...filterValues, [key]: value };
    setFilterValues(newFilters);
    onChange(newFilters);
  };

  const updateComplexFilter = (filterType, field, value) => {
    const currentFilter = filterValues[filterType] || {};
    const newFilter = { ...currentFilter, [field]: value };
    Object.keys(newFilter).forEach(key => {
      if (!newFilter[key] || newFilter[key] === '') delete newFilter[key];
    });
    updateFilter(filterType, Object.keys(newFilter).length > 0 ? newFilter : undefined);
  };

  const clearAllFilters = () => {
    setFilterValues({});
    onChange({});
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    Object.keys(filterValues).forEach(key => {
      if (filterValues[key] && key !== 'date_range') count++;
    });
    if (filterValues.date_range) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
        <h3 className="m-0 text-lg font-semibold text-slate-800">Фильтры данных</h3>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-xl text-xs font-semibold">{activeFiltersCount}</span>
          )}
          {activeFiltersCount > 0 && (
            <button
              className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs cursor-pointer transition-all duration-200 hover:bg-gray-200 hover:border-gray-400"
              onClick={clearAllFilters}
            >
              Очистить
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-slate-100">
        <div
          className="flex items-center px-5 py-4 cursor-pointer transition-colors duration-200 hover:bg-slate-50"
          onClick={() => toggleSection('date')}
        >
          <span className="text-base mr-2">📅</span>
          <span className="flex-1 font-semibold text-gray-700">Период времени</span>
          <span className={`text-xs text-gray-500 transition-transform duration-200 ${expandedSections.date ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {expandedSections.date && (
          <div className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Дата начала:</label>
              <input
                type="date"
                value={filterValues.date_range?.start || ''}
                onChange={(e) => updateComplexFilter('date_range', 'start', e.target.value)}
                className="max-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Дата окончания:</label>
              <input
                type="date"
                value={filterValues.date_range?.end || ''}
                onChange={(e) => updateComplexFilter('date_range', 'end', e.target.value)}
                className="max-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              />
            </div>

            <div className="mt-2">
              <span className="text-xs text-gray-500 font-medium mb-2 block">Быстрый выбор:</span>
              <div className="flex gap-2 flex-wrap">
                {[7, 30, 90].map(days => (
                  <button
                    key={days}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs cursor-pointer transition-all duration-200 hover:bg-gray-200 hover:border-gray-400 active:bg-gray-300"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - days);
                      updateComplexFilter('date_range', 'start', start.toISOString().split('T')[0]);
                      updateComplexFilter('date_range', 'end', end.toISOString().split('T')[0]);
                    }}
                  >
                    {days} дней
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-slate-100">
        <div
          className="flex items-center px-5 py-4 cursor-pointer transition-colors duration-200 hover:bg-slate-50"
          onClick={() => toggleSection('categories')}
        >
          <span className="text-base mr-2">🏷️</span>
          <span className="flex-1 font-semibold text-gray-700">Категории</span>
          <span className={`text-xs text-gray-500 transition-transform duration-200 ${expandedSections.categories ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {expandedSections.categories && (
          <div className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Категория товара:</label>
              <select value={filterValues.category || ''} onChange={(e) => updateFilter('category', e.target.value)} className="max-w-[250px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
                <option value="">Все категории</option>
                <option value="food">Корм</option>
                <option value="pharmacy">Ветаптека</option>
                <option value="ammunition">Амуниция</option>
                <option value="care">Уход</option>
                <option value="transport">Транспортировка</option>
                <option value="toys">Игрушки</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Вид животного:</label>
              <select value={filterValues.pet_species || ''} onChange={(e) => updateFilter('pet_species', e.target.value)} className="max-w-[250px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
                <option value="">Все виды</option>
                <option value="dog">Собаки</option>
                <option value="cat">Кошки</option>
                <option value="bird">Птицы</option>
                <option value="rodent">Грызуны</option>
                <option value="fish">Рыбки</option>
                <option value="reptile">Рептилии</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Статус заказа:</label>
              <select value={filterValues.order_status || ''} onChange={(e) => updateFilter('order_status', e.target.value)} className="max-w-[250px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
                <option value="">Все статусы</option>
                <option value="pending">Ожидает</option>
                <option value="processing">В обработке</option>
                <option value="partially_delivered">Частично доставлен</option>
                <option value="shipped">Отправлен</option>
                <option value="delivered">Доставлен</option>
                <option value="cancelled">Отменен</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-slate-100 last:border-b-0">
        <div
          className="flex items-center px-5 py-4 cursor-pointer transition-colors duration-200 hover:bg-slate-50"
          onClick={() => toggleSection('metrics')}
        >
          <span className="text-base mr-2">📊</span>
          <span className="flex-1 font-semibold text-gray-700">Расширенные фильтры</span>
          <span className={`text-xs text-gray-500 transition-transform duration-200 ${expandedSections.metrics ? 'rotate-180' : ''}`}>▼</span>
        </div>

        {expandedSections.metrics && (
          <div className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Минимальное значение:</label>
              <input type="number" value={filterValues.min_value || ''} onChange={(e) => updateFilter('min_value', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="0" className="max-w-[150px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Максимальное значение:</label>
              <input type="number" value={filterValues.max_value || ''} onChange={(e) => updateFilter('max_value', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="1000" className="max-w-[150px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Тип пользователя:</label>
              <select value={filterValues.user_type || ''} onChange={(e) => updateFilter('user_type', e.target.value)} className="max-w-[250px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
                <option value="">Все пользователи</option>
                <option value="new">Новые (до 30 дней)</option>
                <option value="active">Активные</option>
                <option value="premium">Премиум</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Источник трафика:</label>
              <select value={filterValues.traffic_source || ''} onChange={(e) => updateFilter('traffic_source', e.target.value)} className="max-w-[250px] px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
                <option value="">Все источники</option>
                <option value="organic">Органический</option>
                <option value="paid">Платный</option>
                <option value="social">Социальные сети</option>
                <option value="referral">Реферальная программа</option>
                <option value="direct">Прямой заход</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="mx-5 my-4 p-3 bg-emerald-50 rounded-md border border-emerald-500">
          <p className="m-1 text-xs text-emerald-800 font-semibold">🎯 <strong>Активные фильтры:</strong> {activeFiltersCount}</p>
          <p className="m-1 text-xs text-emerald-800">Данные будут отфильтрованы согласно выбранным критериям</p>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
