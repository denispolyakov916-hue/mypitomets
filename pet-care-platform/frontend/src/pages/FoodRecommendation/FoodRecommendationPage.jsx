/**
 * FoodRecommendationPage - Страница подбора корма
 * 
 * Интеллектуальный конструктор рациона питания для питомца.
 * Подбирает корм на основе данных из PetID.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, UtensilsCrossed, Loader2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, ShoppingCart, Sparkles,
  Check, Zap, Award, Download, Info, TrendingUp, ChevronDown
} from 'lucide-react';
import { 
  getPets, 
  getPet, 
  getFeedingPlan, 
  getFoodAlternatives,
  FEEDING_TYPE_OPTIONS,
  PLAN_VARIANT_OPTIONS,
  FEEDING_PERIOD_OPTIONS 
} from '../../api/pets';
import { addToCart } from '../../api/shop';

// ============================================================================
// КОМПОНЕНТ: Выпадающий список выбора питомца
// ============================================================================
const PetDropdown = ({ pets, selectedPet, onSelect, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const listboxIdRef = useRef(`pet-dropdown-listbox-${Math.random().toString(36).slice(2)}`);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    if (pets.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = selectedPet
      ? pets.findIndex((pet) => pet.id === selectedPet.id)
      : -1;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, pets, selectedPet]);

  const moveActiveIndex = (delta) => {
    if (pets.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return pets.length - 1;
      if (next >= pets.length) return 0;
      return next;
    });
  };
  
  if (pets.length === 0) return null;
  
  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">Питомец</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all
          ${isOpen ? 'border-purple-500 ring-4 ring-purple-100' : 'border-gray-200 hover:border-purple-300'}
          ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxIdRef.current}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
        }
        aria-haspopup="listbox"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            moveActiveIndex(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            moveActiveIndex(-1);
            return;
          }
          if (e.key === 'Home') {
            e.preventDefault();
            if (pets.length > 0) setActiveIndex(0);
            return;
          }
          if (e.key === 'End') {
            e.preventDefault();
            if (pets.length > 0) setActiveIndex(pets.length - 1);
            return;
          }
          if (e.key === 'Enter' && isOpen && activeIndex >= 0) {
            e.preventDefault();
            onSelect(pets[activeIndex]);
            setIsOpen(false);
            return;
          }
          if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        {selectedPet ? (
          <div className="flex items-center gap-3">
            <span className="text-xl">{selectedPet.species === 'dog' ? '🐕' : '🐱'}</span>
            <div className="text-left">
              <span className="font-medium text-gray-800">{selectedPet.name}</span>
              <span className="text-gray-400 mx-2">•</span>
              <span className="text-sm text-gray-500">
                {selectedPet.breed_name || 'Порода не указана'}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-gray-400">Выберите питомца...</span>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            id={listboxIdRef.current}
            role="listbox"
          >
            {pets.map((pet, index) => (
              <button
                key={pet.id}
                onClick={() => {
                  onSelect(pet);
                  setIsOpen(false);
                }}
                id={`${listboxIdRef.current}-opt-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                tabIndex={-1}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                  ${activeIndex === index
                    ? 'bg-purple-100 text-purple-700'
                    : selectedPet?.id === pet.id
                      ? 'bg-purple-50'
                      : 'hover:bg-purple-50'}`}
              >
                <span className="text-xl">{pet.species === 'dog' ? '🐕' : '🐱'}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{pet.name}</p>
                  <p className="text-xs text-gray-500">
                    {pet.breed_name || 'Порода не указана'}
                    {(pet.weight_kg || pet.weight) && ` • ${pet.weight_kg || pet.weight} кг`}
                  </p>
                </div>
                {selectedPet?.id === pet.id && <Check className="w-5 h-5 text-purple-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Выпадающий список общего назначения
// ============================================================================
const SelectDropdown = ({ options, value, onChange, label, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const listboxIdRef = useRef(`select-dropdown-listbox-${Math.random().toString(36).slice(2)}`);
  
  const selectedOption = options.find(o => o.value === value);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    if (options.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = value
      ? options.findIndex((option) => option.value === value)
      : -1;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, options, value]);

  const moveActiveIndex = (delta) => {
    if (options.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all
          ${isOpen ? 'border-purple-500 ring-4 ring-purple-100' : 'border-gray-200 hover:border-purple-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxIdRef.current}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
        }
        aria-haspopup="listbox"
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            moveActiveIndex(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            moveActiveIndex(-1);
            return;
          }
          if (e.key === 'Home') {
            e.preventDefault();
            if (options.length > 0) setActiveIndex(0);
            return;
          }
          if (e.key === 'End') {
            e.preventDefault();
            if (options.length > 0) setActiveIndex(options.length - 1);
            return;
          }
          if (e.key === 'Enter' && isOpen && activeIndex >= 0) {
            e.preventDefault();
            onChange(options[activeIndex].value);
            setIsOpen(false);
            return;
          }
          if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span className="font-medium text-gray-800">{selectedOption?.label || 'Выберите...'}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            id={listboxIdRef.current}
            role="listbox"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                id={`${listboxIdRef.current}-opt-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                tabIndex={-1}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                  ${activeIndex === index
                    ? 'bg-purple-100 text-purple-700'
                    : value === option.value
                      ? 'bg-purple-50'
                      : 'hover:bg-purple-50'}`}
              >
                {option.icon && <span className="text-lg">{option.icon}</span>}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-gray-500">{option.description}</p>
                  )}
                </div>
                {value === option.value && <Check className="w-5 h-5 text-purple-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Гибкий ввод периода (1-60 дней) - выпадающий список с подсказками
// ============================================================================
const PeriodInput = ({ value, onChange, disabled }) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isOpen, setIsOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listboxIdRef = useRef(`period-listbox-${Math.random().toString(36).slice(2)}`);
  
  const presets = [
    { value: 7, label: '7 дн.', desc: 'Неделя' },
    { value: 14, label: '14 дн.', desc: '2 недели' },
    { value: 30, label: '30 дн.', desc: 'Месяц' },
  ];
  
  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    if (presets.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = presets.findIndex((preset) => preset.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, presets, value]);

  const moveActiveIndex = (delta) => {
    if (presets.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return presets.length - 1;
      if (next >= presets.length) return 0;
      return next;
    });
  };
  
  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setInputValue(val);
    setShowWarning(false);
    setIsOpen(true);
    
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 60) {
      onChange(num);
    } else if (num > 60) {
      setShowWarning(true);
    }
  };
  
  const handleSelect = (days) => {
    setInputValue(days.toString());
    onChange(days);
    setIsOpen(false);
    setShowWarning(false);
  };
  
  const handleBlur = () => {
    setTimeout(() => {
      const num = parseInt(inputValue, 10);
      if (isNaN(num) || num < 1) {
        setInputValue('7');
        onChange(7);
      } else if (num > 60) {
        setInputValue('60');
        onChange(60);
        setShowWarning(true);
      }
    }, 150);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">Период подбора</label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={2}
          className={`w-full px-4 py-3 pr-12 border-2 rounded-xl text-sm font-medium transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
            ${isOpen ? 'border-purple-500 ring-4 ring-purple-100' : 'border-gray-200 hover:border-purple-300'}
            ${showWarning ? 'border-amber-400 ring-4 ring-amber-100' : ''}`}
          placeholder="Введите дни..."
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxIdRef.current}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
          }
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isOpen) setIsOpen(true);
              moveActiveIndex(1);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!isOpen) setIsOpen(true);
              moveActiveIndex(-1);
              return;
            }
            if (e.key === 'Home') {
              e.preventDefault();
              if (presets.length > 0) setActiveIndex(0);
              return;
            }
            if (e.key === 'End') {
              e.preventDefault();
              if (presets.length > 0) setActiveIndex(presets.length - 1);
              return;
            }
            if (e.key === 'Enter' && isOpen && activeIndex >= 0) {
              e.preventDefault();
              handleSelect(presets[activeIndex].value);
              return;
            }
            if (e.key === 'Escape' && isOpen) {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }
          }}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">дней</span>
      </div>
      
      {/* Выпадающий список с подсказками */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            id={listboxIdRef.current}
            role="listbox"
          >
            {presets.map((preset, index) => (
              <button
                key={preset.value}
                onClick={() => handleSelect(preset.value)}
                id={`${listboxIdRef.current}-opt-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                tabIndex={-1}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left
                  ${activeIndex === index
                    ? 'bg-purple-100 text-purple-700'
                    : value === preset.value
                      ? 'bg-purple-50'
                      : 'hover:bg-purple-50'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{preset.label}</span>
                  <span className="text-xs text-gray-400">{preset.desc}</span>
                </div>
                {value === preset.value && <Check className="w-5 h-5 text-purple-600" />}
              </button>
            ))}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500">Или введите своё значение (1-60 дней)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Предупреждение при превышении 60 дней */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <p className="font-medium mb-1">📋 Оптимальный период: до 60 дней</p>
              <p>Это позволяет точнее подобрать рацион и при необходимости оперативно скорректировать питание.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Переключатель варианта набора (Базовый/Продвинутый)
// ============================================================================
const VariantToggle = ({ value, onChange, disabled }) => (
  <div className="flex bg-gray-100 rounded-xl p-1">
    {PLAN_VARIANT_OPTIONS.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        disabled={disabled}
        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
          ${value === option.value 
            ? 'bg-white text-purple-700 shadow-sm' 
            : 'text-gray-600 hover:text-gray-800'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// ============================================================================
// КОМПОНЕНТ: Компактная карточка компонента рациона
// ============================================================================
const RationComponentCard = ({ 
  component,
  alternatives = [],
  currentIndex = 0,
  onChangeIndex,
  isLoading,
  componentType
}) => {
  const navigate = useNavigate();
  
  // Если нет компонента - не рендерим
  if (!component) return null;
  
  const typeLabels = {
    'dry_food': 'Сухой корм',
    'dry_food_multi': 'Сухой корм (60%)',
    'wet_food': 'Влажный корм',
    'wet_food_multi': 'Влажный корм (30%)',
    'treat': 'Лакомства (10%)',
    'supplement': 'Добавка',
  };
  
  const typeEmoji = {
    'dry_food': '🥫',
    'dry_food_multi': '🥫',
    'wet_food': '🍖',
    'wet_food_multi': '🍖',
    'treat': '🦴',
    'supplement': '💊',
  };
  
  // Безопасное определение типа компонента
  const baseType = componentType?.startsWith('supplement_') 
    ? 'supplement' 
    : (component?.product_type || 'dry_food');
  
  const totalItems = alternatives?.length || 0;
  const canNavigate = totalItems > 1;
  
  // Переход на страницу товара
  const handleProductClick = () => {
    if (component.shop_url) {
      navigate(component.shop_url);
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Компактный заголовок */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span>{typeEmoji[baseType] || '📦'}</span>
          <span className="text-xs font-medium text-gray-600">
            {typeLabels[baseType] || baseType}
          </span>
        </div>
        {totalItems > 1 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {currentIndex + 1}/{totalItems}
          </span>
        )}
      </div>
      
      {/* Контент */}
      <div className="flex items-stretch">
        {/* Стрелка влево */}
        <button 
          onClick={() => canNavigate && onChangeIndex(currentIndex - 1)}
          disabled={!canNavigate || isLoading}
          className={`px-2 flex items-center border-r border-gray-100 transition-colors
            ${canNavigate && !isLoading ? 'hover:bg-gray-50 text-gray-400 hover:text-gray-600' : 'text-gray-200 cursor-not-allowed'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {/* Основной контент - кликабельный */}
        <div 
          className="flex-1 p-3 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleProductClick}
        >
          {/* Картинка товара */}
          <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
            {component.image_url ? (
              <img 
                src={component.image_url} 
                alt={component.product_name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {typeEmoji[baseType] || '📦'}
              </div>
            )}
          </div>
          
          {/* Информация */}
          <div className="flex-1 min-w-0">
            {/* Название - компактное */}
            <h4 className="font-medium text-sm text-gray-800 line-clamp-1 mb-0.5">
              {component.product_name}
            </h4>
            
            {/* Короткое описание */}
            {component.short_description && (
              <p className="text-xs text-gray-500 line-clamp-1 mb-1">
                {component.short_description}
              </p>
            )}
            
            {/* Детали в зависимости от типа */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {/* Для корма: граммы, калории и БЖУ */}
              {(baseType && baseType.includes('food')) && (
                <>
                  {component.daily_grams && (
                    <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                      {component.daily_grams} г/день
                    </span>
                  )}
                  {component.kcal_per_100g && (
                    <span className="text-gray-400">
                      {component.kcal_per_100g} ккал/100г
                    </span>
                  )}
                  {/* БЖУ */}
                  {component.nutrition && (
                    <span className="text-gray-400 text-[10px]">
                      Б{component.nutrition.protein || '—'}/Ж{component.nutrition.fat || '—'}/К{component.nutrition.fiber || '—'}
                    </span>
                  )}
                </>
              )}
              
              {/* Для лакомств: граммы и штуки (ВСЕГДА показываем ~штуки) */}
              {baseType === 'treat' && (
                <>
                  {component.daily_grams && (
                    <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                      {component.daily_grams} г/день
                    </span>
                  )}
                  <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                    ~{component.pieces_per_day || Math.max(1, Math.round((component.daily_grams || 30) / 10))} шт/день
                  </span>
                </>
              )}
              
              {/* Для добавок: дозировка и время приёма */}
              {baseType === 'supplement' && (
                <>
                  {component.dosage_text && (
                    <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                      {component.dosage_text}
                    </span>
                  )}
                  {component.intake_time && (
                    <span className="text-gray-400">
                      ⏰ {component.intake_time}
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* Причина рекомендации для добавок */}
            {component.reasons?.length > 0 && baseType === 'supplement' && (
              <p className="text-xs text-purple-600 mt-1 line-clamp-1">
                ✨ {component.reasons[0]}
              </p>
            )}
          </div>
          
          {/* Цена справа */}
          <div className="flex flex-col items-end justify-between text-right flex-shrink-0">
            <span className="font-bold text-purple-700">
              {component.price 
                ? `${(parseFloat(component.price) * (component.packages_needed || 1)).toLocaleString('ru-RU')} ₽`
                : '—'
              }
            </span>
            <div className="text-xs text-gray-400">
              {component.packages_needed > 1 && (
                <span>×{component.packages_needed} уп.</span>
              )}
              {component.days_supply > 0 && (
                <span className="block text-green-600">~{component.days_supply} дн.</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Стрелка вправо */}
        <button 
          onClick={() => canNavigate && onChangeIndex(currentIndex + 1)}
          disabled={!canNavigate || isLoading}
          className={`px-2 flex items-center border-l border-gray-100 transition-colors
            ${canNavigate && !isLoading ? 'hover:bg-gray-50 text-gray-400 hover:text-gray-600' : 'text-gray-200 cursor-not-allowed'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Блок плана питания (обновлённый)
// ============================================================================
const FeedingPlanBlock = ({ plan, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }
  
  if (!plan) return null;
  
  const regularDay = plan.regular_day || {};
  const meals = regularDay.meals || [];
  const treats = regularDay.treats;
  const supplements = regularDay.supplements || [];
  const tips = regularDay.feeding_tips || [];
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <UtensilsCrossed className="w-5 h-5 text-orange-600" />
        План питания
      </h3>
      
      {/* Дневная норма */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4">
        <p className="text-xs text-gray-500 mb-1">Дневная норма</p>
        <p className="text-2xl font-bold text-gray-800">
          {regularDay.total_kcal || Math.round(plan.daily_calories)} <span className="text-sm font-normal">ккал</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {regularDay.meals_count || 2} кормления в день
        </p>
        
        {/* БЖУ за день (расчёт из компонентов) */}
        {plan.components?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-orange-200/50">
            <p className="text-xs text-gray-500 mb-1">Питательные вещества (в день)</p>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {(() => {
                // Суммируем БЖУ из всех компонентов с учётом порции
                const totals = { protein: 0, fat: 0, fiber: 0, calcium: 0 };
                plan.components.forEach(c => {
                  if (c.nutrition && c.daily_grams) {
                    const ratio = c.daily_grams / 100;
                    totals.protein += (c.nutrition.protein || 0) * ratio;
                    totals.fat += (c.nutrition.fat || 0) * ratio;
                    totals.fiber += (c.nutrition.fiber || 0) * ratio;
                    totals.calcium += (c.nutrition.calcium || 0) * ratio;
                  }
                });
                return (
                  <>
                    <div className="bg-white/60 rounded p-1.5 text-center">
                      <p className="font-semibold text-orange-700">{totals.protein.toFixed(1)}г</p>
                      <p className="text-[10px] text-gray-500">Белок</p>
                    </div>
                    <div className="bg-white/60 rounded p-1.5 text-center">
                      <p className="font-semibold text-orange-700">{totals.fat.toFixed(1)}г</p>
                      <p className="text-[10px] text-gray-500">Жир</p>
                    </div>
                    <div className="bg-white/60 rounded p-1.5 text-center">
                      <p className="font-semibold text-orange-700">{totals.fiber.toFixed(1)}г</p>
                      <p className="text-[10px] text-gray-500">Клетч.</p>
                    </div>
                    <div className="bg-white/60 rounded p-1.5 text-center">
                      <p className="font-semibold text-orange-700">{(totals.calcium * 1000).toFixed(0)}мг</p>
                      <p className="text-[10px] text-gray-500">Кальций</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      
      {/* Расписание кормлений - динамическое на основе выбранных компонентов */}
      {plan.components?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Расписание кормления
          </p>
          <div className="space-y-2">
            {(() => {
              // Формируем расписание из компонентов
              const dryFood = plan.components.find(c => c.product_type?.includes('dry'));
              const wetFood = plan.components.find(c => c.product_type?.includes('wet'));
              
              const schedule = [];
              
              // Утро - сухой корм (если есть)
              if (dryFood) {
                const portion = wetFood 
                  ? Math.round(dryFood.daily_grams * 0.5)  // Если мульти - половина утром
                  : Math.round(dryFood.daily_grams * 0.5); // Или половина дневной нормы
                schedule.push({
                  time: '08:00',
                  label: 'Завтрак',
                  product: dryFood.product_name?.split(' ').slice(0, 3).join(' ') || 'Сухой корм',
                  type: 'dry',
                  grams: portion,
                  kcal: Math.round(portion * (dryFood.kcal_per_100g || 350) / 100)
                });
              }
              
              // Обед - влажный корм (если есть)
              if (wetFood) {
                const portion = Math.round(wetFood.daily_grams * 0.5);
                schedule.push({
                  time: '13:00',
                  label: 'Обед',
                  product: wetFood.product_name?.split(' ').slice(0, 3).join(' ') || 'Влажный корм',
                  type: 'wet',
                  grams: portion,
                  kcal: Math.round(portion * (wetFood.kcal_per_100g || 95) / 100)
                });
              }
              
              // Ужин
              if (dryFood && wetFood) {
                // Мультипитание: вечером сухой
                const portion = Math.round(dryFood.daily_grams * 0.5);
                schedule.push({
                  time: '18:00',
                  label: 'Ужин',
                  product: dryFood.product_name?.split(' ').slice(0, 3).join(' ') || 'Сухой корм',
                  type: 'dry',
                  grams: portion,
                  kcal: Math.round(portion * (dryFood.kcal_per_100g || 350) / 100)
                });
                // + влажный
                const wetPortion = Math.round(wetFood.daily_grams * 0.5);
                schedule.push({
                  time: '18:00',
                  label: '+',
                  product: wetFood.product_name?.split(' ').slice(0, 3).join(' ') || 'Влажный корм',
                  type: 'wet',
                  grams: wetPortion,
                  kcal: Math.round(wetPortion * (wetFood.kcal_per_100g || 95) / 100)
                });
              } else if (dryFood) {
                // Только сухой
                const portion = Math.round(dryFood.daily_grams * 0.5);
                schedule.push({
                  time: '18:00',
                  label: 'Ужин',
                  product: dryFood.product_name?.split(' ').slice(0, 3).join(' ') || 'Сухой корм',
                  type: 'dry',
                  grams: portion,
                  kcal: Math.round(portion * (dryFood.kcal_per_100g || 350) / 100)
                });
              } else if (wetFood) {
                // Только влажный
                const portion = Math.round(wetFood.daily_grams * 0.5);
                schedule.push({
                  time: '18:00',
                  label: 'Ужин',
                  product: wetFood.product_name?.split(' ').slice(0, 3).join(' ') || 'Влажный корм',
                  type: 'wet',
                  grams: portion,
                  kcal: Math.round(portion * (wetFood.kcal_per_100g || 95) / 100)
                });
              }
              
              return schedule.map((meal, i) => (
                <div 
                  key={i}
                  className={`p-2.5 rounded-lg text-sm ${
                    meal.type === 'dry' ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-mono">{meal.time}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        meal.type === 'dry' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'
                      }`}>
                        {meal.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{meal.kcal} ккал</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium line-clamp-1 ${
                      meal.type === 'dry' ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {meal.type === 'dry' ? '🥫' : '🍖'} {meal.product}
                    </span>
                    <span className={`font-semibold ${
                      meal.type === 'dry' ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {meal.grams}г
                    </span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      
      {/* Лакомства - из компонентов */}
      {(() => {
        const treatComp = plan.components?.find(c => c.product_type === 'treat');
        if (!treatComp && !treats) return null;
        
        const data = treatComp || treats;
        const productName = treatComp?.product_name?.split(' ').slice(0, 4).join(' ') || 'Лакомства';
        const dailyGrams = treatComp?.daily_grams || treats?.daily_grams;
        const piecesPerDay = treatComp?.pieces_per_day || treats?.pieces_per_day || (dailyGrams ? Math.max(1, Math.round(dailyGrams / 10)) : null);
        
        return (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Лакомства (между кормлениями)
            </p>
            <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-lg text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span>🦴</span>
                  <span className="text-orange-700 font-medium line-clamp-1">{productName}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {dailyGrams && (
                    <span className="text-orange-700 font-semibold">{dailyGrams}г</span>
                  )}
                  {piecesPerDay && (
                    <span className="text-xs text-gray-500 ml-1">(~{piecesPerDay} шт)</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 Распределить в течение дня, не более 10% от суточной нормы
              </p>
            </div>
          </div>
        );
      })()}
      
      {/* Добавки - из supplements или компонентов */}
      {(() => {
        // Берём добавки из supplements или из компонентов с типом supplement
        const suppList = supplements.length > 0 
          ? supplements 
          : plan.supplements?.map(s => ({
              product: s.product_name,
              dosage: s.dosage_text || 'По инструкции',
              time: s.intake_time || 'с едой'
            })) || [];
        
        if (suppList.length === 0) return null;
        
        return (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Добавки и витамины
            </p>
            <div className="space-y-2">
              {suppList.map((supp, i) => (
                <div key={i} className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-700 font-medium flex items-center gap-1">
                      💊 {supp.product?.split(' ').slice(0, 4).join(' ') || 'Добавка'}
                    </span>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                      {supp.dosage}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>⏰ {supp.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      
      {/* Советы */}
      {tips.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> Советы
          </p>
          <ul className="space-y-1">
            {tips.slice(0, 3).map((tip, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                <span className="text-green-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Активный день */}
      {plan.active_day && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" /> Активный день
            </span>
            <span className="text-xs text-green-600 font-medium">
              +{plan.active_day.extra_percent}%
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {plan.active_day.total_kcal} ккал ({plan.active_day.note})
          </p>
        </div>
      )}
      
      {/* Кнопка PDF */}
      <button className="w-full mt-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 
                         rounded-xl transition-colors flex items-center justify-center gap-2 border border-purple-200">
        <Download className="w-4 h-4" />
        Скачать PDF
      </button>
    </div>
  );
};

// ============================================================================
// ГЛАВНЫЙ КОМПОНЕНТ СТРАНИЦЫ
// ============================================================================
export default function FoodRecommendationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Состояние
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Настройки плана
  const [feedingType, setFeedingType] = useState('multi');
  const [planVariant, setPlanVariant] = useState('basic');
  const [period, setPeriod] = useState(30);
  
  // Данные плана
  const [feedingPlan, setFeedingPlan] = useState(null);
  
  // Компоненты рациона с альтернативами
  // { type: 'dry_food', alternatives: [...], currentIndex: 0 }
  const [componentStates, setComponentStates] = useState({});
  
  // Загрузка питомцев
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await getPets();
        const petsList = response.pets || response.data?.pets || [];
        const completedPets = petsList.filter(p => (p.weight_kg || p.weight));
        setPets(completedPets);
        
        // Если указан pet_id в URL
        const petIdFromUrl = searchParams.get('pet_id');
        if (petIdFromUrl) {
          const pet = completedPets.find(p => p.id === petIdFromUrl);
          if (pet) {
            setSelectedPet(pet);
          } else {
            try {
              const petResponse = await getPet(petIdFromUrl);
              const petData = petResponse.data || petResponse;
              if (petData.weight_kg || petData.weight) {
                setSelectedPet(petData);
              }
            } catch (e) {
              console.error('Питомец не найден:', e);
            }
          }
        } else if (completedPets.length === 1) {
          setSelectedPet(completedPets[0]);
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [searchParams]);
  
  // Загрузка плана при изменении настроек
  useEffect(() => {
    if (!selectedPet) return;
    
    const loadFeedingPlan = async () => {
      try {
        setIsPlanLoading(true);
        setError(null);
        
        const response = await getFeedingPlan(selectedPet.id, {
          food_type: feedingType,
          variant: planVariant,
          period_days: period,
        });
        
        const plan = response.data || response;
        setFeedingPlan(plan);
        
        // Инициализация состояния компонентов из бэкенда
        const states = {};
        
        // Добавляем основные компоненты (корма)
        (plan.components || []).forEach((comp) => {
          const type = comp.product_type;
          if (!states[type]) {
            states[type] = {
              alternatives: [comp],
              currentIndex: 0,
            };
          } else {
            // Добавляем как альтернативу если тип уже есть
            states[type].alternatives.push(comp);
          }
        });
        
        // Добавляем добавки из бэкенда (для продвинутого набора)
        // Каждая добавка - отдельный компонент
        if (plan.supplements?.length > 0) {
          plan.supplements.forEach((supp, index) => {
            const type = `supplement_${index}`;
            states[type] = {
              alternatives: [supp],
              currentIndex: 0
            };
          });
        }
        
        setComponentStates(states);
        
      } catch (err) {
        console.error('Ошибка загрузки плана:', err);
        setError('Не удалось загрузить план питания');
      } finally {
        setIsPlanLoading(false);
      }
    };
    
    loadFeedingPlan();
  }, [selectedPet, feedingType, planVariant, period]);
  
  // Загрузка альтернатив для компонента
  const loadAlternatives = useCallback(async (componentType) => {
    if (!selectedPet || !componentStates[componentType]) return;
    
    const state = componentStates[componentType];
    const currentComponent = state.alternatives[state.currentIndex];
    
    if (!currentComponent?.product_id) return;
    
    // Если альтернативы уже загружены (больше 1)
    if (state.alternatives.length > 1) return;
    
    // Определяем базовый тип для API (supplement_0 -> supplement)
    let apiType = componentType;
    if (componentType.startsWith('supplement_')) {
      apiType = 'supplement';
    }
    
    try {
      const response = await getFoodAlternatives(
        selectedPet.id,
        currentComponent.product_id,
        apiType,
        { 
          limit: 20, 
          period_days: period, 
          food_type: feedingType 
        }
      );
      
      const alternatives = response.data?.alternatives || response.alternatives || [];
      
      if (alternatives.length > 0) {
        // ВАЖНО: Фильтруем альтернативы только по нужному типу компонента
        const filteredAlternatives = alternatives.filter(alt => {
          // Для supplement_X сравниваем базовый тип
          const expectedType = apiType;
          const altType = alt.product_type?.replace('_multi', '') || '';
          const expType = expectedType.replace('_multi', '');
          return altType.startsWith(expType) || altType === expType;
        });
        
        if (filteredAlternatives.length > 0) {
          setComponentStates(prev => ({
            ...prev,
            [componentType]: {
              ...prev[componentType],
              alternatives: [currentComponent, ...filteredAlternatives],
            }
          }));
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки альтернатив:', err);
    }
  }, [selectedPet, componentStates, period, feedingType]);
  
  // Автозагрузка альтернатив при получении плана
  useEffect(() => {
    if (!feedingPlan || Object.keys(componentStates).length === 0) return;
    
    // Загружаем альтернативы для каждого компонента
    const loadAll = async () => {
      for (const type of Object.keys(componentStates)) {
        await loadAlternatives(type);
      }
    };
    loadAll();
  }, [feedingPlan]); // Только при смене плана
  
  // Смена индекса компонента (пролистывание) - циклическая
  const handleChangeComponentIndex = useCallback((componentType, newIndex) => {
    const state = componentStates[componentType];
    if (!state) return;
    
    const maxIndex = state.alternatives.length - 1;
    
    // Циклическое переключение
    let actualIndex = newIndex;
    if (newIndex < 0) {
      actualIndex = maxIndex; // Переход в конец
    } else if (newIndex > maxIndex) {
      actualIndex = 0; // Переход в начало
    }
    
    setComponentStates(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        currentIndex: actualIndex,
      }
    }));
  }, [componentStates]);
  
  // Расчёт общей стоимости выбранных компонентов
  const totalCost = Object.values(componentStates).reduce((sum, state) => {
    const current = state.alternatives[state.currentIndex];
    if (!current?.price) return sum;
    const price = parseFloat(current.price);
    const packages = current.packages_needed || 1;
    return sum + (price * packages);
  }, 0);
  
  // Добавление в корзину
  const handleAddToCart = async () => {
    try {
      for (const state of Object.values(componentStates)) {
        const component = state.alternatives[state.currentIndex];
        if (component?.product_id) {
          await addToCart(component.product_id, component.packages_needed || 1);
        }
      }
      navigate('/cart');
    } catch (err) {
      console.error('Ошибка добавления в корзину:', err);
      setError('Не удалось добавить товары в корзину');
    }
  };
  
  // Получение текущих компонентов для отображения
  const currentComponents = Object.entries(componentStates).map(([type, state]) => ({
    type,
    component: state.alternatives[state.currentIndex],
    alternatives: state.alternatives,
    currentIndex: state.currentIndex,
  }));
  
  // Загрузка
  if (isLoading) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Нет питомцев
  if (pets.length === 0) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="text-6xl mb-4">🐾</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Для подбора корма нужен профиль питомца
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Создайте профиль питомца с указанием веса для персонализированного подбора рациона.
          </p>
          <button
            onClick={() => navigate('/pet-id')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl 
                       font-medium hover:shadow-lg transition-all"
          >
            Создать PetID
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container animate-fadeIn pb-8">
      {/* Хедер */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-purple-600" />
            Подбор корма
          </h1>
          <p className="text-gray-500 text-sm">
            Персональные рекомендации на основе профиля питомца
          </p>
        </div>
      </div>
      
      {/* Ошибка */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Предупреждение о неполном профиле */}
      {selectedPet && (selectedPet.profile_completeness || 0) < 50 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              Профиль заполнен на {selectedPet.profile_completeness || 0}%
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Для более точного подбора заполните информацию о здоровье и аллергиях.
            </p>
            <button 
              onClick={() => navigate(`/pets/${selectedPet.id}/edit`)}
              className="mt-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              Заполнить профиль →
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Основной контент */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Левая колонка */}
        <div className="lg:col-span-2 space-y-6">
          {/* Настройки */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <PetDropdown 
                pets={pets} 
                selectedPet={selectedPet} 
                onSelect={setSelectedPet}
                isLoading={isPlanLoading}
              />
              
              <SelectDropdown
                label="Тип питания"
                options={FEEDING_TYPE_OPTIONS}
                value={feedingType}
                onChange={setFeedingType}
                disabled={isPlanLoading}
              />
            </div>
            
            <PeriodInput
              value={period}
              onChange={setPeriod}
              disabled={isPlanLoading}
            />
          </div>
          
          {/* Конструктор рациона */}
          {selectedPet && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {/* Заголовок с переключателем варианта */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Конструктор рациона
                </h3>
                
                <VariantToggle
                  value={planVariant}
                  onChange={setPlanVariant}
                  disabled={isPlanLoading}
                />
              </div>
              
              {isPlanLoading && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
              )}
              
              {/* Компоненты */}
              {!isPlanLoading && currentComponents.length > 0 && (
                <div className="space-y-4">
                  {currentComponents.map(({ type, component, alternatives, currentIndex }) => (
                    <RationComponentCard
                      key={type}
                      component={component}
                      alternatives={alternatives}
                      currentIndex={currentIndex}
                      onChangeIndex={(idx) => handleChangeComponentIndex(type, idx)}
                      isLoading={isPlanLoading}
                      componentType={type}
                    />
                  ))}
                </div>
              )}
              
              {!isPlanLoading && currentComponents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Нет подходящих товаров</p>
                  <p className="text-sm mt-1">Попробуйте изменить параметры</p>
                </div>
              )}
              
              {/* Итого */}
              {!isPlanLoading && currentComponents.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Итого на {period} дней:</span>
                    <span className="text-2xl font-bold text-gray-800">
                      {totalCost > 0 ? `${totalCost.toLocaleString('ru-RU')} ₽` : '—'}
                    </span>
                  </div>
                  
                  <button 
                    onClick={handleAddToCart}
                    disabled={isPlanLoading || totalCost === 0}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white 
                               rounded-xl font-medium hover:shadow-lg transition-all flex items-center 
                               justify-center gap-2 disabled:opacity-50"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Добавить в корзину
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Правая колонка */}
        <div className="lg:col-span-1">
          {selectedPet && (
            <div className="sticky top-24">
              <FeedingPlanBlock 
                plan={feedingPlan} 
                isLoading={isPlanLoading} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
