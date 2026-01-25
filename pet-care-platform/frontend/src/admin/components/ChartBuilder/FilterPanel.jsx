import React, { useState, useEffect } from 'react';

// Styles
import './FilterPanel.css';

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

  // Переключение видимости секции
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Обновление фильтра
  const updateFilter = (key, value) => {
    const newFilters = { ...filterValues, [key]: value };
    setFilterValues(newFilters);
    onChange(newFilters);
  };

  // Добавление/обновление сложного фильтра
  const updateComplexFilter = (filterType, field, value) => {
    const currentFilter = filterValues[filterType] || {};
    const newFilter = { ...currentFilter, [field]: value };

    // Удаляем пустые значения
    Object.keys(newFilter).forEach(key => {
      if (!newFilter[key] || newFilter[key] === '') {
        delete newFilter[key];
      }
    });

    updateFilter(filterType, Object.keys(newFilter).length > 0 ? newFilter : undefined);
  };

  // Очистка всех фильтров
  const clearAllFilters = () => {
    setFilterValues({});
    onChange({});
  };

  // Получение активных фильтров
  const getActiveFiltersCount = () => {
    let count = 0;

    // Считаем простые фильтры
    Object.keys(filterValues).forEach(key => {
      if (filterValues[key] && key !== 'date_range') {
        count++;
      }
    });

    // Считаем сложные фильтры
    if (filterValues.date_range) {
      count++;
    }

    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Фильтры данных</h3>
        <div className="filter-actions">
          {activeFiltersCount > 0 && (
            <span className="active-count">{activeFiltersCount}</span>
          )}
          {activeFiltersCount > 0 && (
            <button
              className="clear-filters-btn"
              onClick={clearAllFilters}
            >
              Очистить
            </button>
          )}
        </div>
      </div>

      {/* Фильтр по датам */}
      <div className="filter-section">
        <div
          className="section-header"
          onClick={() => toggleSection('date')}
        >
          <span className="section-icon">📅</span>
          <span className="section-title">Период времени</span>
          <span className={`expand-icon ${expandedSections.date ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>

        {expandedSections.date && (
          <div className="section-content">
            <div className="filter-group">
              <label>Дата начала:</label>
              <input
                type="date"
                value={filterValues.date_range?.start || ''}
                onChange={(e) => updateComplexFilter('date_range', 'start', e.target.value)}
                className="date-input"
              />
            </div>

            <div className="filter-group">
              <label>Дата окончания:</label>
              <input
                type="date"
                value={filterValues.date_range?.end || ''}
                onChange={(e) => updateComplexFilter('date_range', 'end', e.target.value)}
                className="date-input"
              />
            </div>

            {/* Быстрые периоды */}
            <div className="quick-periods">
              <span className="quick-label">Быстрый выбор:</span>
              <div className="quick-buttons">
                <button
                  className="quick-btn"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 7);
                    updateComplexFilter('date_range', 'start', start.toISOString().split('T')[0]);
                    updateComplexFilter('date_range', 'end', end.toISOString().split('T')[0]);
                  }}
                >
                  7 дней
                </button>
                <button
                  className="quick-btn"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 30);
                    updateComplexFilter('date_range', 'start', start.toISOString().split('T')[0]);
                    updateComplexFilter('date_range', 'end', end.toISOString().split('T')[0]);
                  }}
                >
                  30 дней
                </button>
                <button
                  className="quick-btn"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 90);
                    updateComplexFilter('date_range', 'start', start.toISOString().split('T')[0]);
                    updateComplexFilter('date_range', 'end', end.toISOString().split('T')[0]);
                  }}
                >
                  90 дней
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Фильтр по категориям */}
      <div className="filter-section">
        <div
          className="section-header"
          onClick={() => toggleSection('categories')}
        >
          <span className="section-icon">🏷️</span>
          <span className="section-title">Категории</span>
          <span className={`expand-icon ${expandedSections.categories ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>

        {expandedSections.categories && (
          <div className="section-content">
            <div className="filter-group">
              <label>Категория товара:</label>
              <select
                value={filterValues.category || ''}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="category-select"
              >
                <option value="">Все категории</option>
                <option value="food">Корм</option>
                <option value="pharmacy">Ветаптека</option>
                <option value="ammunition">Амуниция</option>
                <option value="care">Уход</option>
                <option value="transport">Транспортировка</option>
                <option value="toys">Игрушки</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Вид животного:</label>
              <select
                value={filterValues.pet_species || ''}
                onChange={(e) => updateFilter('pet_species', e.target.value)}
                className="species-select"
              >
                <option value="">Все виды</option>
                <option value="dog">Собаки</option>
                <option value="cat">Кошки</option>
                <option value="bird">Птицы</option>
                <option value="rodent">Грызуны</option>
                <option value="fish">Рыбки</option>
                <option value="reptile">Рептилии</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Статус заказа:</label>
              <select
                value={filterValues.order_status || ''}
                onChange={(e) => updateFilter('order_status', e.target.value)}
                className="status-select"
              >
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

      {/* Расширенные фильтры */}
      <div className="filter-section">
        <div
          className="section-header"
          onClick={() => toggleSection('metrics')}
        >
          <span className="section-icon">📊</span>
          <span className="section-title">Расширенные фильтры</span>
          <span className={`expand-icon ${expandedSections.metrics ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>

        {expandedSections.metrics && (
          <div className="section-content">
            <div className="filter-group">
              <label>Минимальное значение:</label>
              <input
                type="number"
                value={filterValues.min_value || ''}
                onChange={(e) => updateFilter('min_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0"
                className="number-input"
              />
            </div>

            <div className="filter-group">
              <label>Максимальное значение:</label>
              <input
                type="number"
                value={filterValues.max_value || ''}
                onChange={(e) => updateFilter('max_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="1000"
                className="number-input"
              />
            </div>

            <div className="filter-group">
              <label>Тип пользователя:</label>
              <select
                value={filterValues.user_type || ''}
                onChange={(e) => updateFilter('user_type', e.target.value)}
                className="user-type-select"
              >
                <option value="">Все пользователи</option>
                <option value="new">Новые (до 30 дней)</option>
                <option value="active">Активные</option>
                <option value="premium">Премиум</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Источник трафика:</label>
              <select
                value={filterValues.traffic_source || ''}
                onChange={(e) => updateFilter('traffic_source', e.target.value)}
                className="source-select"
              >
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

      {/* Информация о фильтрах */}
      {activeFiltersCount > 0 && (
        <div className="filter-info">
          <p>🎯 <strong>Активные фильтры:</strong> {activeFiltersCount}</p>
          <p>Данные будут отфильтрованы согласно выбранным критериям</p>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
