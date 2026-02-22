/**
 * Компоненты фильтрации курсов
 *
 * Боковая панель фильтров (десктоп) и горизонтальные фильтры (мобильные).
 */

import { useState, useEffect, useRef } from 'react'

const PET_TYPE_OPTIONS = [
  { value: '', label: 'Все курсы' },
  { value: 'dog', label: 'Для собак' },
  { value: 'cat', label: 'Для кошек' },
  { value: 'all', label: 'Для всех' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Все категории' },
  { value: 'basics', label: 'Основы' },
  { value: 'training', label: 'Дрессировка' },
  { value: 'care', label: 'Уход' },
  { value: 'health', label: 'Здоровье' },
  { value: 'nutrition', label: 'Питание' },
  { value: 'behavior', label: 'Поведение' },
  { value: 'specialized', label: 'Специализированные' },
  { value: 'entertainment', label: 'Развлечения' },
]

const LEVEL_OPTIONS = [
  { value: '', label: 'Все уровни' },
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' },
]

const FORMAT_OPTIONS = [
  { value: '', label: 'Все форматы' },
  { value: 'video', label: 'Видео' },
  { value: 'text', label: 'Текст' },
  { value: 'interactive', label: 'Интерактивный' },
  { value: 'mixed', label: 'Смешанный' },
  { value: 'webinar', label: 'Вебинар' },
  { value: 'workshop', label: 'Мастер-класс' },
]

/**
 * Боковая панель фильтров (десктоп)
 */
function FilterSidebar({ filters, availableFilters, onFilterChange, onReset }) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || '',
    max: filters.max_price || ''
  })

  const sidebarRef = useRef(null)

  useEffect(() => {
    const handleWheel = (e) => {
      if (sidebarRef.current && sidebarRef.current.contains(e.target)) {
        const sidebar = sidebarRef.current
        const isAtTop = sidebar.scrollTop === 0
        const isAtBottom = sidebar.scrollTop + sidebar.clientHeight >= sidebar.scrollHeight

        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
          return
        }

        e.stopPropagation()
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handlePriceApply = () => {
    onFilterChange('min_price', priceRange.min)
    onFilterChange('max_price', priceRange.max)
  }
  
  return (
    <div
      ref={sidebarRef}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-y-auto"
      style={{
        overscrollBehavior: 'contain',
        maxHeight: 'calc(100vh - 8rem)'
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Фильтры</h3>
        <button
          onClick={onReset}
          className={`text-sm transition-colors ${
            (filters.pet_type || filters.personal || filters.category || filters.subcategory || filters.level || filters.format_type || filters.min_price || filters.max_price)
              ? 'text-primary-600 hover:text-primary-700'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Очистить фильтры
        </button>
      </div>
      
      {/* Персональные подборки для питомцев */}
      {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
        <div className="mb-5 pb-5 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-primary-600">⭐</span>
            Персональные подборки
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Курсы специально для ваших питомцев
          </p>
          <div className="space-y-2">
            {availableFilters.user_pets.map(pet => {
              const hasCourses = ['dog', 'cat'].includes(pet.species)
              if (!hasCourses) return null
              
              const isSelected = filters.pet_id === pet.id
              
              return (
                <label 
                  key={pet.id} 
                  className={`flex items-center cursor-pointer group p-2 rounded-lg transition-colors ${
                    isSelected 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="pet_id"
                    value={pet.id}
                    checked={isSelected}
                    onChange={(e) => onFilterChange('pet_id', e.target.value)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`ml-2 text-sm ${
                    isSelected 
                      ? 'text-primary-700 font-medium' 
                      : 'text-gray-700 group-hover:text-primary-600'
                  }`}>
                    {pet.name} <span className="text-gray-500">({pet.species_label})</span>
                  </span>
                </label>
              )
            })}
            {filters.pet_id && (
              <button
                onClick={() => onFilterChange('pet_id', '')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
              >
                Показать все курсы
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Тип животного */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Для кого
        </label>
        <div className="space-y-2">
          {availableFilters.pet_types?.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="pet_type"
                value={opt.value}
                checked={filters.pet_type === opt.value}
                onChange={(e) => onFilterChange('pet_type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">{opt.label}</span>
            </label>
          )) || PET_TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="pet_type"
                value={opt.value}
                checked={filters.pet_type === opt.value}
                onChange={(e) => onFilterChange('pet_type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">{opt.label}</span>
            </label>
          ))}
          {filters.pet_type && (
            <button
              onClick={() => onFilterChange('pet_type', '')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Показать всех
            </button>
          )}
        </div>
      </div>
      
      {/* Категория */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Категория
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Все категории</option>
          {(availableFilters.categories || CATEGORY_OPTIONS.filter(o => o.value)).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Уровень сложности */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Уровень сложности
        </label>
        <select
          value={filters.level || ''}
          onChange={(e) => onFilterChange('level', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Все уровни</option>
          {(availableFilters.levels || LEVEL_OPTIONS.filter(o => o.value)).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Формат обучения */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Формат обучения
        </label>
        <select
          value={filters.format_type || ''}
          onChange={(e) => onFilterChange('format_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Все форматы</option>
          {(availableFilters.formats || FORMAT_OPTIONS.filter(o => o.value)).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Тип цены */}
      {availableFilters.price_types && availableFilters.price_types.length > 0 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип цены
          </label>
          <div className="space-y-2">
            {availableFilters.price_types.map(opt => (
              <label key={opt.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="price_type"
                  value={opt.value}
                  checked={filters.price_type === opt.value}
                  onChange={(e) => onFilterChange('price_type', e.target.value)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Цена */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Цена, ₽
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="от"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={handlePriceApply}
          className="mt-2 w-full py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Применить
        </button>
        {availableFilters.price_range && (
          <p className="mt-1 text-xs text-gray-500">
            {Math.floor(availableFilters.price_range.min)} — {Math.ceil(availableFilters.price_range.max)} ₽
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Мобильные фильтры (горизонтальная полоса)
 */
function MobileFilters({ filters, onFilterChange, onReset, pets }) {
  return (
    <div className="lg:hidden mb-4">
      <div className="mb-3">
        <button
          onClick={onReset}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            (filters.pet_type || filters.personal || filters.category || filters.subcategory || filters.level || filters.format_type || filters.min_price || filters.max_price)
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          🧹 Очистить фильтры
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {pets && pets.length > 0 && (
          <label className="flex items-center cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white whitespace-nowrap">
            <input
              type="checkbox"
              checked={filters.personal === 'true'}
              onChange={(e) => onFilterChange('personal', e.target.checked ? 'true' : '')}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded mr-2"
            />
            <span>Для моих питомцев</span>
          </label>
        )}
        <select
          value={filters.pet_type}
          onChange={(e) => onFilterChange('pet_type', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {PET_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filters.level}
          onChange={(e) => onFilterChange('level', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {LEVEL_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filters.format_type}
          onChange={(e) => onFilterChange('format_type', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {FORMAT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export { FilterSidebar, MobileFilters }
