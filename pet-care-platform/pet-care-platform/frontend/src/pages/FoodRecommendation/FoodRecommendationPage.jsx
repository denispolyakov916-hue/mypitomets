/**
 * FoodRecommendationPage - Страница подбора корма
 * 
 * Интеллектуальный конструктор рациона питания для питомца.
 * Подбирает корм на основе данных из PetID.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UtensilsCrossed, Loader2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, ShoppingCart, Sparkles,
  Check, Zap, Award, Download, Info, TrendingUp, ChevronDown,
  Calendar, MapPin, Bone, Package, Circle
} from 'lucide-react';
import { 
  getPets, 
  getPet, 
  getFeedingPlan, 
  getFoodAlternatives,
  FEEDING_TYPE_OPTIONS,
  PLAN_VARIANT_OPTIONS,
  FEEDING_PERIOD_OPTIONS,
  getMultiRatioPresetOptions,
} from '../../api/pets';
import { addToCart, getCategories, getProductsV2 } from '../../api/shop';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip);

// Расчёт позиции выпадающего меню в viewport, чтобы меню было полностью видно
const getMenuPosition = (triggerRect, maxMenuHeight = 320, gap = 8) => {
  const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
  const spaceAbove = triggerRect.top - gap;
  const width = triggerRect.width;
  const left = triggerRect.left;
  if (spaceBelow >= maxMenuHeight || spaceBelow >= spaceAbove) {
    return { top: triggerRect.bottom + gap, left, width, maxHeight: Math.min(maxMenuHeight, Math.max(200, spaceBelow)) };
  }
  return { top: triggerRect.top - Math.min(maxMenuHeight, spaceAbove) - gap, left, width, maxHeight: Math.min(maxMenuHeight, Math.max(200, spaceAbove)) };
};

// ============================================================================
// КОМПОНЕНТ: Выпадающий список выбора питомца
// ============================================================================
const PetDropdown = ({ pets, selectedPet, onSelect, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxIdRef = useRef(`pet-dropdown-listbox-${Math.random().toString(36).slice(2)}`);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      const trigger = dropdownRef.current;
      const menu = document.getElementById(listboxIdRef.current);
      if (trigger && !trigger.contains(e.target) && (!menu || !menu.contains(e.target))) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition(getMenuPosition(rect, 360));
  }, [isOpen]);

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
  
  const dropdownContent = isOpen && menuPosition && createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto p-2"
        id={listboxIdRef.current}
        role="listbox"
        style={{
          position: 'fixed',
          left: menuPosition.left,
          top: menuPosition.top,
          width: menuPosition.width,
          maxHeight: menuPosition.maxHeight,
          zIndex: 9999,
          scrollbarGutter: 'stable',
        }}
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
              ${activeIndex === index
                ? 'bg-primary-100 text-primary-700'
                : selectedPet?.id === pet.id
                  ? 'bg-primary-50'
                  : 'hover:bg-primary-50'}`}
          >
            <span className="text-xl flex-shrink-0">{pet.species === 'dog' ? '🐕' : '🐱'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{pet.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {pet.breed_name || 'Порода не указана'}
                {(pet.weight_kg || pet.weight) && ` • ${pet.weight_kg || pet.weight} кг`}
              </p>
            </div>
            {selectedPet?.id === pet.id && <Check className="w-5 h-5 flex-shrink-0 text-primary-600" />}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
  
  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">Питомец</label>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl transition-all
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'hover:border-gray-300'}
          ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxIdRef.current}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
        }
        aria-haspopup="listbox"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            moveActiveIndex(1);
            return;
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
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
            <span className={`text-xl flex-shrink-0 ${selectedPet.species === 'cat' ? 'opacity-90' : ''}`} title={selectedPet.species === 'cat' ? 'Кошка' : 'Собака'}>
              {selectedPet.species === 'dog' ? '🐕' : '🐱'}
            </span>
            <div className="text-left min-w-0">
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
      {dropdownContent}
    </div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Выпадающий список общего назначения
// ============================================================================
const SelectDropdown = ({ options, value, onChange, label, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxIdRef = useRef(`select-dropdown-listbox-${Math.random().toString(36).slice(2)}`);
  const listRef = useRef(null);
  const selectedOption = options.find(o => o.value === value);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      const trigger = dropdownRef.current;
      const menu = document.getElementById(listboxIdRef.current);
      if (trigger && !trigger.contains(e.target) && (!menu || !menu.contains(e.target))) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition(getMenuPosition(rect, 320));
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    const opt = listRef.current.querySelector(`[id="${listboxIdRef.current}-opt-${activeIndex}"]`);
    if (opt) opt.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [isOpen, activeIndex]);
  
  const dropdownContent = isOpen && menuPosition && createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        id={listboxIdRef.current}
        role="listbox"
        style={{
          position: 'fixed',
          left: menuPosition.left,
          top: menuPosition.top,
          width: menuPosition.width,
          maxHeight: menuPosition.maxHeight,
          zIndex: 9999,
        }}
      >
        <div
          ref={listRef}
          className="flex flex-col overflow-y-auto p-2 scroll-smooth"
          style={{ scrollbarGutter: 'stable' }}
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
              className={`w-full flex flex-row items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left
                ${activeIndex === index
                  ? 'bg-primary-100 text-primary-700'
                  : value === option.value
                    ? 'bg-primary-50'
                    : 'hover:bg-primary-50'}`}
            >
              {option.icon && <span className="text-lg shrink-0">{option.icon}</span>}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800">{option.label}</p>
                {option.description && (
                  <p className="text-xs text-gray-500">{option.description}</p>
                )}
              </div>
              {value === option.value && <Check className="w-5 h-5 shrink-0 text-primary-600" />}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all
          ${isOpen ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-200 hover:border-primary-300'}
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
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            moveActiveIndex(1);
            return;
          }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
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
      {dropdownContent}
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
  const [menuPosition, setMenuPosition] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxIdRef = useRef(`period-listbox-${Math.random().toString(36).slice(2)}`);
  
  const presets = [
    { value: 14, label: '14 дн.', desc: '2 недели' },
    { value: 7, label: '7 дн.', desc: 'Неделя' },
    { value: 30, label: '30 дн.', desc: 'Месяц' },
  ];
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      const trigger = dropdownRef.current;
      const menu = document.getElementById(listboxIdRef.current);
      if (trigger && !trigger.contains(e.target) && (!menu || !menu.contains(e.target))) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPosition(getMenuPosition(rect, 320));
  }, [isOpen]);

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
  
  const dropdownContent = isOpen && menuPosition && createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        id={listboxIdRef.current}
        role="listbox"
        style={{
          position: 'fixed',
          left: menuPosition.left,
          top: menuPosition.top,
          width: menuPosition.width,
          maxHeight: menuPosition.maxHeight,
          zIndex: 9999,
        }}
      >
        <div className="overflow-y-auto" style={{ maxHeight: menuPosition.maxHeight }}>
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
                  ? 'bg-primary-100 text-primary-700'
                  : value === preset.value
                    ? 'bg-primary-50'
                    : 'hover:bg-primary-50'}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">{preset.label}</span>
                <span className="text-xs text-gray-400">{preset.desc}</span>
              </div>
              {value === preset.value && <Check className="w-5 h-5 text-primary-600" />}
            </button>
          ))}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">Или введите своё значение (1-60 дней)</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2 leading-snug break-words">
        Период (дней), на который рассчитан комплект питания
      </label>
      
      <div ref={triggerRef} className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={2}
          className={`w-full pl-4 pr-11 py-3 border border-gray-200 rounded-xl text-sm font-medium transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
            ${isOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'hover:border-gray-300'}
            ${showWarning ? 'border-secondary-400 ring-2 ring-secondary-100' : ''}`}
          placeholder="Дни..."
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
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
          <Calendar className="w-5 h-5" />
        </span>
        <span className="absolute right-11 top-1/2 -translate-y-1/2 text-sm text-gray-500">дней</span>
      </div>
      {dropdownContent}
      
      {/* Предупреждение при превышении 60 дней */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-lg text-xs text-secondary-800">
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
// КОМПОНЕНТ: Слайдер соотношения сухой / влажный корм (с градиентом)
// ============================================================================
const RatioSlider = ({ options, value, onChange, disabled }) => {
  const index = options.findIndex((o) => o.value === value);
  const currentIndex = index >= 0 ? index : 0;
  const current = options[currentIndex] || options[0];
  const match = (current.label || '').match(/(\d+)\s*%\s*\/\s*(\d+)\s*%/);
  const dryPct = match ? parseInt(match[1], 10) : 50;
  const wetPct = match ? parseInt(match[2], 10) : 50;
  const position = options.length > 1 ? (currentIndex / (options.length - 1)) * 100 : 50;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Соотношение сухой / влажный корм
      </label>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1 shrink-0">
          <span aria-hidden>🥫</span> {dryPct}%
        </span>
        <div className="flex-1 relative h-3.5 flex items-center">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-400 via-accent-300 to-primary-500 overflow-hidden"
            aria-hidden
          />
          <button
            type="button"
            role="slider"
            aria-valuenow={currentIndex}
            aria-valuemin={0}
            aria-valuemax={options.length - 1}
            aria-label={`Соотношение: ${current.label}`}
            disabled={disabled}
            onClick={(e) => {
              if (disabled) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const i = Math.min(options.length - 1, Math.max(0, Math.round(x * (options.length - 1))));
              onChange(options[i].value);
            }}
            className="absolute inset-0 w-full cursor-pointer disabled:cursor-not-allowed rounded-full"
          />
          <span
            className="absolute w-4 h-4 rounded-full bg-primary-600 border-2 border-white shadow pointer-events-none transition-all duration-200"
            style={{ left: `calc(${position}% - 8px)`, top: '50%', transform: 'translateY(-50%)' }}
            aria-hidden
          />
        </div>
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1 shrink-0">
          {wetPct}% <span aria-hidden>🍖</span>
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Переключатель варианта набора (Базовый/Продвинутый)
// ============================================================================
const VariantToggle = ({ value, onChange, disabled }) => (
  <div className="flex rounded-full overflow-hidden border border-gray-200 bg-[#F8F8F8] p-0.5">
    {PLAN_VARIANT_OPTIONS.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        disabled={disabled}
        className={`flex-1 py-2.5 px-4 text-sm font-medium transition-all rounded-full
          ${value === option.value 
            ? option.value === 'advanced'
              ? 'bg-gradient-to-r from-[#B8A4E6] to-[#7A4EC8] text-white shadow-sm'
              : 'bg-gradient-to-r from-[#FECD48] via-[#F5A623] to-[#E8952A] text-white shadow-sm'
            : 'bg-transparent text-gray-700 hover:bg-white/60'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// ============================================================================
// Утилиты для определения типа корма
// ============================================================================
const normalizeFoodType = (type) => {
  if (!type) return null;
  if (type.startsWith('supplement_')) return 'supplement';
  return type.replace('_multi', '');
};

const isComponentTypeCompatible = (componentType, item) => {
  if (!item) return true;
  const slotType = normalizeFoodType(componentType);
  const itemType = normalizeFoodType(item.product_type);
  if (slotType && itemType && slotType !== itemType) return false;
  return true;
};

const findCategoryByCode = (nodes, codePrefix) => {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node?.code && node.code.startsWith(codePrefix)) {
      return node;
    }
    const found = findCategoryByCode(node?.children, codePrefix);
    if (found) return found;
  }
  return null;
};

const mapProductToSupplementComponent = (product) => ({
  product_id: product.id,
  product_name: product.name,
  product_type: 'supplement',
  match_score: 80,
  price: product.price,
  weight_grams: product.weight_grams,
  packages_needed: 1,
  days_supply: null,
  reasons: [],
  warnings: [],
  badges: [],
  short_description: product.short_description,
  image_url: product.image_url,
  shop_url: product.shop_url || `/shop/products/${product.id}`,
  dosage_text: product.dosage_text,
  intake_time: product.intake_time,
  intake_instructions: product.intake_instructions,
  supplement_type: product.supplement_type,
});

const mapProductToTreatComponent = (product) => ({
  product_id: product.id,
  product_name: product.name,
  product_type: 'treat',
  match_score: 80,
  price: product.price,
  weight_grams: product.weight_grams,
  packages_needed: 1,
  daily_grams: 10,
  treat_frequency_days: 2,
  pieces_per_day: null,
  reasons: [],
  warnings: [],
  badges: [],
  short_description: product.short_description,
  image_url: product.image_url,
  shop_url: product.shop_url || `/shop/products/${product.id}`,
});

const SUPPLEMENT_LABELS = {
  vitamins: 'Витамины',
  omega3: 'Омега‑3',
  joint: 'Суставы',
  calcium: 'Кальций',
  taurine: 'Таурин',
  kidney: 'Почки',
  skin: 'Кожа и шерсть',
  digestion: 'Пищеварение',
  probiotics: 'Пробиотики',
  immune: 'Иммунитет',
  senior: 'Для пожилых',
  folic_acid: 'Фолиевая кислота',
  heart: 'Сердце',
};

const inferSupplementTypeFromName = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('омега') || n.includes('omega')) return 'omega3';
  if (n.includes('сустав') || n.includes('joint')) return 'joint';
  if (n.includes('кальц')) return 'calcium';
  if (n.includes('таур')) return 'taurine';
  if (n.includes('почек') || n.includes('renal') || n.includes('kidney')) return 'kidney';
  if (n.includes('кожа') || n.includes('шерст') || n.includes('skin')) return 'skin';
  if (n.includes('пищевар') || n.includes('digest') || n.includes('gastro')) return 'digestion';
  if (n.includes('пробиот')) return 'probiotics';
  if (n.includes('иммун') || n.includes('immune')) return 'immune';
  if (n.includes('senior') || n.includes('пожил')) return 'senior';
  if (n.includes('фолиев')) return 'folic_acid';
  if (n.includes('серд')) return 'heart';
  if (n.includes('витамин')) return 'vitamins';
  return null;
};

const getSupplementLabel = (component) => {
  const type = component?.supplement_type || inferSupplementTypeFromName(component?.product_name);
  return SUPPLEMENT_LABELS[type] || 'Добавка';
};

const adjustTreatComponentForFrequency = (component, frequencyDays, periodDays) => {
  if (!component || component.product_type !== 'treat') return component;
  const baseDailyGrams = Number(component.daily_grams) || 0;
  const baseDailyKcal = Number(component.daily_kcal) || 0;
  const basePiecesPerDay = Number(component.pieces_per_day) || 0;
  const defaultFreq = Number(component.treat_frequency_days) || 2;
  const freq = Number(frequencyDays) || defaultFreq;

  if (!baseDailyGrams || !freq) return component;

  const adjustedDailyGrams = Math.max(1, Math.round((baseDailyGrams * defaultFreq) / freq));
  const adjustedDailyKcal = baseDailyKcal ? Math.round((baseDailyKcal * defaultFreq) / freq) : baseDailyKcal;
  const adjustedPiecesPerDay = basePiecesPerDay
    ? Math.max(1, Math.round((basePiecesPerDay * defaultFreq) / freq))
    : basePiecesPerDay;

  let packagesNeeded = component.packages_needed;
  let daysSupply = component.days_supply;
  let packageSummary = component.package_summary;

  if (component.weight_grams && periodDays) {
    const totalGramsNeeded = adjustedDailyGrams * periodDays * 1.15;
    packagesNeeded = Math.max(1, Math.ceil(totalGramsNeeded / component.weight_grams));
    daysSupply = Math.floor((component.weight_grams * packagesNeeded) / adjustedDailyGrams);
    packageSummary = `${packagesNeeded} уп.`;
  }

  return {
    ...component,
    daily_grams: adjustedDailyGrams,
    daily_kcal: adjustedDailyKcal,
    pieces_per_day: adjustedPiecesPerDay,
    packages_needed: packagesNeeded,
    days_supply: daysSupply,
    package_summary: packageSummary,
    treat_frequency_days: freq,
  };
};

// ============================================================================
// КОМПОНЕНТ: Компактная карточка компонента рациона
// ============================================================================
const RationComponentCard = ({ 
  component,
  alternatives = [],
  currentIndex = 0,
  onChangeIndex,
  isLoading,
  componentType,
  onProductClick,
  labelOverride,
  showRemove,
  onRemove,
  removeButtonRight = false,
  calorieDistribution,
  dailyCalories,
  accentVariant = 'amber', // 'amber' | 'purple' — в продвинутом режиме фиолетовый градиент
}) => {
  const navigate = useNavigate();
  const isPurple = accentVariant === 'purple';
  
  // Если нет компонента - не рендерим
  if (!component) return null;
  
  // Безопасное определение типа компонента (нужно раньше для расчёта подписи)
  const baseType = componentType?.startsWith('supplement_') 
    ? 'supplement' 
    : (componentType || component?.product_type || 'dry_food');
  
  // Проценты берём из calorie_distribution (серверное значение, точно соответствует выбранному пресету)
  const dryPct = calorieDistribution?.dry_food != null ? Math.round(calorieDistribution.dry_food * 100) : null;
  const wetPct = calorieDistribution?.wet_food != null ? Math.round(calorieDistribution.wet_food * 100) : null;
  
  const typeLabels = {
    'dry_food': 'Сухой корм',
    'dry_food_multi': dryPct != null ? `Сухой корм (${dryPct}%)` : 'Сухой корм',
    'wet_food': 'Влажный корм',
    'wet_food_multi': wetPct != null ? `Влажный корм (${wetPct}%)` : 'Влажный корм',
    'treat': 'Лакомства',
    'supplement': labelOverride || 'Добавка',
  };
  
  const typeEmoji = {
    'dry_food': '🥫',
    'dry_food_multi': '🥫',
    'wet_food': '🍖',
    'wet_food_multi': '🍖',
    'treat': '🦴',
    'supplement': '💊',
  };
  
  const totalItems = alternatives?.length || 0;
  const canNavigate = totalItems > 1;
  
  // Переход на страницу товара
  const handleProductClick = () => {
    if (onProductClick) {
      onProductClick(component);
      return;
    }
    if (component?.product_id) {
      navigate(`/shop/products/${component.product_id}`);
    } else if (component?.shop_url) {
      navigate(component.shop_url);
    }
  };
  
  const portionKcal = component.kcal_per_100g && component.daily_grams
    ? Math.round((component.daily_grams * component.kcal_per_100g) / 100)
    : null;
  const kcalLine = null; // ккал убраны с фронта по запросу
  const packLine = component.weight_grams
    ? `1×${(component.weight_grams / 1000).toFixed(component.weight_grams >= 1000 ? 1 : 2)} кг`
    : component.package_summary || null;
  const daysLine = component.days_supply > 0 ? `−${component.days_supply} дн.` : null;

  const cardBg = 'bg-white border-gray-200';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden max-w-full min-w-0 ${cardBg}`}
    >
      {/* Заголовок типа с иконкой и галочкой — без цвета */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/80 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="opacity-90" aria-hidden>{typeEmoji[baseType] || '📦'}</span>
          <span className="text-xs font-medium text-gray-900">
            {typeLabels[baseType] || baseType}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!removeButtonRight && showRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors"
              title="Убрать из плана"
            >
              Убрать
            </button>
          )}
          {totalItems > 1 && (
            <span className="text-xs text-gray-700 bg-white/80 px-2 py-0.5 rounded-full">
              {currentIndex + 1}/{totalItems}
            </span>
          )}
          <span className="text-success-600 flex-shrink-0" aria-hidden>
            <Check className="w-5 h-5" />
          </span>
          {removeButtonRight && showRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors"
              title="Убрать из плана"
            >
              Убрать
            </button>
          )}
        </div>
      </div>
      
      {/* Контент */}
      <div className="flex items-stretch bg-white min-w-0 max-w-full">
        <button 
          onClick={() => canNavigate && onChangeIndex(currentIndex - 1)}
          disabled={!canNavigate || isLoading}
          className={`min-w-[44px] px-3 flex items-center justify-center rounded-l-xl border-r transition-all duration-200
            ${canNavigate && !isLoading
              ? isPurple
                ? 'border-primary-200/60 bg-gradient-to-b from-primary-100 via-primary-50 to-primary-100 text-primary-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_2px_4px_rgba(82,47,129,0.2)] hover:from-primary-200 hover:via-primary-100 hover:to-primary-200 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_4px_8px_rgba(82,47,129,0.25)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]'
                : 'border-amber-200/60 bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100/80 text-amber-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_2px_4px_rgba(251,191,36,0.2)] hover:from-amber-200 hover:via-amber-100 hover:to-amber-200/90 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_4px_8px_rgba(251,191,36,0.25)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
              : 'border-gray-200/60 bg-gradient-to-b from-gray-100 to-gray-50 text-gray-300 cursor-not-allowed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]'}`}
          aria-label="Предыдущий вариант"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div 
          className="flex-1 p-3 flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-r-xl"
          onClick={handleProductClick}
        >
          <div className="w-14 h-14 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200/80 shadow-sm">
            {component.image_url ? (
              <img 
                src={component.image_url} 
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                {typeEmoji[baseType] || '📦'}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-0.5">
              {component.product_name}
            </h4>
            {kcalLine && (
              <p className="text-xs text-gray-700 mb-0.5">{kcalLine}</p>
            )}
            {(baseType === 'treat') && (component.daily_grams || component.pieces_per_day) && (
              <p className="text-xs text-gray-700">
                {component.daily_grams ? `${component.daily_grams} г/день` : ''}
                {component.daily_grams && component.pieces_per_day ? ' • ' : ''}
                {component.pieces_per_day ? `${component.pieces_per_day} шт/день` : ''}
              </p>
            )}
            {baseType === 'supplement' && component.dosage_text && (
              <p className="text-xs text-primary-600">{component.dosage_text}</p>
            )}
            <div className="flex flex-wrap gap-x-2 mt-1 text-[11px] text-gray-400">
              {packLine && <span>{packLine}</span>}
              {daysLine && <span>{daysLine}</span>}
            </div>
          </div>
          
          <div className="flex flex-col items-end justify-center text-right flex-shrink-0 px-2 py-1 min-w-0">
            <span className="font-bold text-gray-900">
              {component.price 
                ? `${(parseFloat(component.price) * (component.packages_needed || 1)).toLocaleString('ru-RU')} Р`
                : '—'
              }
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => canNavigate && onChangeIndex(currentIndex + 1)}
          disabled={!canNavigate || isLoading}
          className={`min-w-[44px] px-3 flex items-center justify-center rounded-r-xl border-l transition-all duration-200
            ${canNavigate && !isLoading
              ? isPurple
                ? 'border-primary-200/60 bg-gradient-to-b from-primary-100 via-primary-50 to-primary-100 text-primary-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_2px_4px_rgba(82,47,129,0.2)] hover:from-primary-200 hover:via-primary-100 hover:to-primary-200 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_4px_8px_rgba(82,47,129,0.25)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]'
                : 'border-amber-200/60 bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100/80 text-amber-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_2px_4px_rgba(251,191,36,0.2)] hover:from-amber-200 hover:via-amber-100 hover:to-amber-200/90 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_4px_8px_rgba(251,191,36,0.25)] hover:scale-[1.02] active:scale-[0.98] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
              : 'border-gray-200/60 bg-gradient-to-b from-gray-100 to-gray-50 text-gray-300 cursor-not-allowed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]'}`}
          aria-label="Следующий вариант"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {canNavigate && alternatives?.length > 0 && (
        <div className="md:hidden border-t border-gray-100 bg-gray-50/90 px-2 py-2">
          <p className="text-[10px] text-gray-500 mb-1.5 px-1">Варианты корма</p>
          <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
            {alternatives.map((alt, idx) => (
              <button
                type="button"
                key={alt.product_id ?? `alt-${idx}`}
                onClick={() => onChangeIndex(idx)}
                className={`shrink-0 snap-start w-14 h-14 rounded-lg border-2 overflow-hidden bg-white transition-all ${
                  idx === currentIndex
                    ? isPurple
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-gray-200 opacity-90'
                }`}
              >
                {alt.image_url ? (
                  <img src={alt.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">{typeEmoji[baseType] || '📦'}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// КОМПОНЕНТ: Кнопка скачивания PDF плана питания
// ============================================================================
const PdfDownloadButton = ({ plan, pet, selectedComponents, treatFrequencyDays, variant = 'secondary' }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const buildScheduleRows = (components) => {
    const rows = [];
    const dry = components.find(c => c.product_type?.includes('dry'));
    const wet = components.find(c => c.product_type?.includes('wet'));

    if (dry) {
      const p = Math.round((dry.daily_grams || 0) * 0.5);
      rows.push({ time: '08:00', label: 'Завтрак', product: dry.product_name || 'Сухой корм', grams: p, kcal: Math.round(p * (dry.kcal_per_100g || 350) / 100) });
    }
    if (wet) {
      const p = Math.round((wet.daily_grams || 0) * 0.5);
      rows.push({ time: '13:00', label: 'Обед', product: wet.product_name || 'Влажный корм', grams: p, kcal: Math.round(p * (wet.kcal_per_100g || 95) / 100) });
    }
    if (dry && wet) {
      const dp = Math.round((dry.daily_grams || 0) * 0.5);
      const wp = Math.round((wet.daily_grams || 0) * 0.5);
      rows.push({ time: '18:00', label: 'Ужин', product: `${dry.product_name || 'Сухой корм'} + ${wet.product_name || 'Влажный корм'}`, grams: dp + wp, kcal: Math.round(dp * (dry.kcal_per_100g || 350) / 100 + wp * (wet.kcal_per_100g || 95) / 100) });
    } else if (dry) {
      const p = Math.round((dry.daily_grams || 0) * 0.5);
      rows.push({ time: '18:00', label: 'Ужин', product: dry.product_name || 'Сухой корм', grams: p, kcal: Math.round(p * (dry.kcal_per_100g || 350) / 100) });
    } else if (wet) {
      const p = Math.round((wet.daily_grams || 0) * 0.5);
      rows.push({ time: '18:00', label: 'Ужин', product: wet.product_name || 'Влажный корм', grams: p, kcal: Math.round(p * (wet.kcal_per_100g || 95) / 100) });
    }
    return rows;
  };

  const handleDownload = async () => {
    if (!plan || isGenerating) return;
    setIsGenerating(true);

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const components = selectedComponents?.length > 0 ? selectedComponents : (plan.components || []);
      const regularDay = plan.regular_day || {};
      const tips = regularDay.feeding_tips || [];
      const treat = components.find(c => c.product_type === 'treat');
      const supplements = components.filter(c => c.product_type === 'supplement');
      const schedule = buildScheduleRows(components);
      const petName = pet?.name || 'Питомец';
      const speciesLabel = pet?.species === 'cat' ? 'Кошка' : 'Собака';
      const breedName = pet?.breed_name || 'Не указана';
      const weight = pet?.weight_kg || pet?.weight || '—';
      const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

      let totalKcal = 0;
      components.forEach(c => {
        if (c?.daily_kcal) { totalKcal += Number(c.daily_kcal); return; }
        if (c?.daily_grams && c?.kcal_per_100g) totalKcal += (Number(c.daily_grams) * Number(c.kcal_per_100g)) / 100;
      });
      const dailyKcal = totalKcal > 0 ? Math.round(totalKcal) : Math.round(plan.daily_calories || 0);

      const treatFreq = treatFrequencyDays || treat?.treat_frequency_days || 2;
      const treatGrams = treat?.daily_grams ? Math.round(treat.daily_grams * treatFreq) : null;
      const treatPieces = treat?.pieces_per_day ? Math.max(1, Math.round(treat.pieces_per_day * treatFreq)) : null;

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;line-height:1.5;';

      const scheduleRowsHtml = schedule.map(m => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#6b7280;">${m.time}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${m.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${m.product}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${m.grams}г</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;">${m.kcal}</td>
        </tr>
      `).join('');

      const foodComponentsHtml = components
        .filter(c => c.product_type?.includes('food') || c.product_type?.includes('dry') || c.product_type?.includes('wet'))
        .map(c => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f9fafb;border-radius:8px;margin-bottom:6px;">
            <div>
              <div style="font-weight:600;font-size:14px;">${c.product_name || 'Корм'}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px;">
                ${c.daily_grams ? `${c.daily_grams} г/день` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              ${c.packages_needed ? `<div style="font-size:12px;color:#6b7280;">${c.packages_needed} уп.</div>` : ''}
              ${c.price ? `<div style="font-weight:700;color:#522f81;">${(parseFloat(c.price) * (c.packages_needed || 1)).toLocaleString('ru-RU')} ₽</div>` : ''}
            </div>
          </div>
        `).join('');

      const treatHtml = treat ? `
        <div style="margin-top:24px;">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#6d4b0b;">🦴 Лакомства</h3>
          <div style="padding:12px 14px;background:#fffdf5;border:1px solid #F0EB93;border-radius:8px;">
            <div style="font-weight:600;">${treat.product_name || 'Лакомство'}</div>
            <div style="font-size:13px;color:#6d4b0b;margin-top:4px;">
              ${treatGrams ? `${treatGrams}г` : ''}${treatPieces ? ` (~${treatPieces} шт)` : ''} • раз в ${treatFreq === 1 ? 'день' : `${treatFreq} дн.`}
            </div>
            <div style="font-size:12px;color:#78716c;margin-top:6px;">💡 Не более 10% от суточной нормы калорий</div>
          </div>
        </div>
      ` : '';

      const supplementsHtml = supplements.length > 0 ? `
        <div style="margin-top:24px;">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#522f81;">💊 Добавки и витамины</h3>
          ${supplements.map(s => `
            <div style="padding:10px 14px;background:#f6f0ff;border:1px solid #d9bfff;border-radius:8px;margin-bottom:6px;">
              <div style="display:flex;justify-content:space-between;">
                <span style="font-weight:600;">${s.product_name || 'Добавка'}</span>
                <span style="font-size:12px;color:#522f81;background:#ede0ff;padding:2px 8px;border-radius:4px;">${s.dosage_text || 'По инструкции'}</span>
              </div>
              ${s.intake_time ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">⏰ ${s.intake_time}${s.intake_instructions ? ` • ${s.intake_instructions}` : ''}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : '';

      const tipsHtml = tips.length > 0 ? `
        <div style="margin-top:24px;">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#e5a41e;">💡 Рекомендации</h3>
          <ul style="list-style:none;padding:0;margin:0;">
            ${tips.map(t => `<li style="padding:6px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">✅ ${t}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      const activeDayHtml = plan.active_day ? `
        <div style="margin-top:24px;">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#c08716;">⚡ Активный день</h3>
          <div style="padding:12px 14px;background:#fffdf5;border:1px solid #F0EB93;border-radius:8px;">
            <div style="font-size:14px;">${plan.active_day.total_kcal} (+${plan.active_day.extra_percent}%)</div>
            <div style="font-size:12px;color:#6d4b0b;margin-top:4px;">${plan.active_day.note || 'Увеличьте порцию при повышенной активности'}</div>
          </div>
        </div>
      ` : '';

      const generalTips = [
        'Всегда обеспечивайте доступ к чистой свежей воде.',
        'Переход на новый корм осуществляйте постепенно в течение 7-10 дней.',
        'Следите за весом питомца и корректируйте порции при необходимости.',
        'Не давайте еду со стола — это может нарушить баланс рациона.',
        'При любых изменениях в аппетите или самочувствии обратитесь к ветеринару.',
      ];

      container.innerHTML = `
        <div style="border-bottom:3px solid #522f81;padding-bottom:20px;margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:800;color:#522f81;margin:0 0 4px;">План питания</h1>
          <div style="font-size:18px;font-weight:600;color:#1a1a1a;">${petName}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:6px;">${speciesLabel} • ${breedName} • ${weight} кг • Составлен ${dateStr}</div>
        </div>

        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="flex:1;padding:16px;background:linear-gradient(135deg,#f6f0ff,#ede0ff);border-radius:12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#522f81;">${dailyKcal}</div>
            <div style="font-size:12px;color:#6b7280;">в день</div>
          </div>
          <div style="flex:1;padding:16px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#16a34a;">${regularDay.meals_count || 2}</div>
            <div style="font-size:12px;color:#6b7280;">кормлений/день</div>
          </div>
          <div style="flex:1;padding:16px;background:linear-gradient(135deg,#fffdf5,#fef8e0);border-radius:12px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#c08716;">${Math.round(plan.daily_calories || dailyKcal)}</div>
            <div style="font-size:12px;color:#6b7280;">норма</div>
          </div>
        </div>

        <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#1e40af;">📋 Расписание кормления</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Время</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Приём</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Продукт</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Порция</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Калории</th>
            </tr>
          </thead>
          <tbody>${scheduleRowsHtml}</tbody>
        </table>

        <div style="margin-top:24px;">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#1e40af;">🥫 Выбранные корма</h3>
          ${foodComponentsHtml}
        </div>

        ${treatHtml}
        ${supplementsHtml}
        ${activeDayHtml}
        ${tipsHtml}

        <div style="margin-top:24px;">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:#374151;">📌 Общие советы по кормлению</h3>
          <ul style="list-style:none;padding:0;margin:0;">
            ${generalTips.map(t => `<li style="padding:5px 0;font-size:12px;color:#4b5563;">• ${t}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:11px;color:#9ca3af;">Сформировано на платформе Питомец+ • ${dateStr}</div>
          <div style="font-size:10px;color:#d1d5db;margin-top:2px;">Рекомендации носят информационный характер. Проконсультируйтесь с ветеринаром.</div>
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let yOffset = 10;
      let remainingHeight = imgHeight;
      const pageContentHeight = pdfHeight - 20;

      if (imgHeight <= pageContentHeight) {
        pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, imgHeight);
      } else {
        let srcY = 0;
        const totalCanvasHeight = canvas.height;
        const pixelsPerPage = (pageContentHeight / imgHeight) * totalCanvasHeight;

        while (srcY < totalCanvasHeight) {
          const sliceHeight = Math.min(pixelsPerPage, totalCanvasHeight - srcY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          const pageImgData = pageCanvas.toDataURL('image/png');
          const slicePdfHeight = (sliceHeight * imgWidth) / canvas.width;
          pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, slicePdfHeight);
          srcY += sliceHeight;
          if (srcY < totalCanvasHeight) pdf.addPage();
        }
      }

      pdf.save(`план-питания-${petName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Ошибка генерации PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating || !plan}
      className={`flex-1 sm:flex-initial w-full sm:w-auto py-3.5 px-5 rounded-xl font-medium transition-all
                 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                 ${isPrimary 
                   ? 'bg-primary-600 hover:bg-primary-700 text-white' 
                   : 'text-primary-600 hover:bg-primary-50 border border-primary-200 mt-4'}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Формируем PDF...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Скачать PDF
        </>
      )}
    </button>
  );
};

// ============================================================================
// КОМПОНЕНТ: Блок плана питания (обновлённый)
// ============================================================================
const FeedingPlanBlock = ({ plan, isLoading, selectedComponents, treatFrequencyDays, onTreatFrequencyChange, pet, variant = 'default' }) => {
  const isSidebar = variant === 'sidebar';

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-gray-200 overflow-hidden bg-white ${!isSidebar ? 'border-primary-200 bg-primary-50/50' : ''}`}>
        {!isSidebar && <div className="border-b border-primary-200 bg-gradient-to-r from-primary-100 to-primary-200 h-14" />}
        <div className="p-5 animate-pulse space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100/60 rounded w-3/4" />
          <div className="h-20 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!plan) return null;
  
  const regularDay = plan.regular_day || {};
  // ВАЖНО: БЖУ/расписание должны считаться по текущему выбранному рациону (с учётом альтернатив),
  // а не только по исходному plan.components с бэкенда.
  const componentsForUi = (selectedComponents && selectedComponents.length > 0)
    ? selectedComponents
    : (plan.components || []);
  const meals = regularDay.meals || [];
  const treats = regularDay.treats;
  const supplements = regularDay.supplements || [];
  const supplementsForUi = componentsForUi?.filter((c) => c?.product_type === 'supplement') || [];
  const supplementSlots = (meals && meals.length > 0)
    ? meals.map((m) => m.label || m.time).filter(Boolean)
    : ['Завтрак', 'Обед', 'Ужин'];
  const tips = regularDay.feeding_tips || [];
  const caloriesForUi = (() => {
    if (!componentsForUi || componentsForUi.length === 0) return null;
    let totalKcal = 0;
    componentsForUi.forEach((c) => {
      if (c?.daily_kcal != null) {
        totalKcal += Number(c.daily_kcal) || 0;
        return;
      }
      if (c?.daily_grams && c?.kcal_per_100g) {
        totalKcal += (Number(c.daily_grams) * Number(c.kcal_per_100g)) / 100;
      }
    });
    if (totalKcal <= 0) return null;
    const target = Number(plan.daily_calories) || 0;
    const baseScale = 1;
    const kcalMinScale = 0.85;
    const kcalMaxScale = 1.15;
    const clampScale = (val) => Math.min(kcalMaxScale, Math.max(kcalMinScale, val));

    const computeProteinCoveragePct = (scale) => {
      let totalGrams = 0;
      let totalProteinG = 0;
      let totalMoisture = 0;
      componentsForUi.forEach((c) => {
        if (!c?.daily_grams || !c?.nutrition) return;
        const grams = (Number(c.daily_grams) || 0) * scale;
        if (grams <= 0) return;
        const proteinPct = Number(c.nutrition.protein) || 0;
        const moisturePct = Number(c.nutrition.moisture) || (c.product_type?.includes('wet') ? 75 : 10);
        totalGrams += grams;
        totalProteinG += (grams * proteinPct) / 100;
        totalMoisture += grams * moisturePct;
      });
      if (totalGrams <= 0) return null;
      const avgMoisture = totalMoisture / totalGrams;
      const dmFactor = avgMoisture < 100 ? 100 / (100 - avgMoisture) : 1;
      const proteinDm = (totalProteinG / totalGrams) * 100 * dmFactor;
      const targets = plan.macro_targets?.protein;
      if (!targets) return null;
      const min = Number(targets.min);
      const max = Number(targets.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return null;
      const mid = (min + max) / 2;
      return mid > 0 ? (proteinDm / mid) * 100 : null;
    };

    const baseProteinPct = computeProteinCoveragePct(baseScale);
    let desiredScale = 1;
    if (baseProteinPct && baseProteinPct > 0) {
      desiredScale = 100 / baseProteinPct;
    }
    const scale = clampScale(desiredScale);
    const adjustedKcal = totalKcal * scale;
    const percent = target > 0 ? Math.round((adjustedKcal / target) * 100) : null;
    return { total: Math.round(adjustedKcal), percent, scale };
  })();
  const dailyNutritionForUi = (() => {
    if (!componentsForUi || componentsForUi.length === 0) return null;

    const scale = caloriesForUi?.scale || 1;
    let totalGrams = 0;
    let totalProteinG = 0;
    let totalFatG = 0;
    let totalFiberG = 0;
    let totalMoisture = 0;

    componentsForUi.forEach((c) => {
      if (!c?.daily_grams || !c?.nutrition) return;
      const grams = (Number(c.daily_grams) || 0) * scale;
      if (grams <= 0) return;
      const proteinPct = Number(c.nutrition.protein) || 0;
      const fatPct = Number(c.nutrition.fat) || 0;
      const fiberPct = Number(c.nutrition.fiber) || 0;
      const moisturePct = Number(c.nutrition.moisture) || (c.product_type?.includes('wet') ? 75 : 10);

      totalGrams += grams;
      totalProteinG += (grams * proteinPct) / 100;
      totalFatG += (grams * fatPct) / 100;
      totalFiberG += (grams * fiberPct) / 100;
      totalMoisture += grams * moisturePct;
    });

    if (totalGrams <= 0) return null;

    const avgMoisture = totalMoisture / totalGrams;
    const dmFactor = avgMoisture < 100 ? 100 / (100 - avgMoisture) : 1;
    const proteinDm = (totalProteinG / totalGrams) * 100 * dmFactor;
    const fatDm = (totalFatG / totalGrams) * 100 * dmFactor;
    const fiberDm = (totalFiberG / totalGrams) * 100 * dmFactor;
    const carbsDm = Math.max(0, 100 - proteinDm - fatDm - fiberDm);
    const totalCarbsG = Number((totalGrams * (carbsDm / 100) / dmFactor).toFixed(1));

    const getCoverage = (macroKey, actual) => {
      const targets = plan.macro_targets?.[macroKey];
      if (!targets) return null;
      const min = Number(targets.min);
      const max = Number(targets.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return null;
      const mid = (min + max) / 2;
      const percent = mid > 0 ? Math.round((actual / mid) * 100) : 100;
      let color = 'green';
      if (actual < min * 0.85 || actual > max * 1.15) color = 'red';
      else if (actual < min || actual > max) color = 'yellow';
      return { percent, color };
    };

    return {
      protein: {
        grams: Number(totalProteinG.toFixed(1)),
        coverage: getCoverage('protein', proteinDm),
        dmPct: Number(proteinDm.toFixed(1)),
      },
      fat: {
        grams: Number(totalFatG.toFixed(1)),
        coverage: getCoverage('fat', fatDm),
        dmPct: Number(fatDm.toFixed(1)),
      },
      carbohydrate: {
        grams: totalCarbsG,
        dmPct: Number(carbsDm.toFixed(1)),
      },
      fiber: {
        grams: Number(totalFiberG.toFixed(1)),
        coverage: getCoverage('fiber', fiberDm),
      },
      note: `БЖУ на сухое вещество (DM ${Math.round(100 - avgMoisture)}%)`,
    };
  })();
  
  return (
    <div className={`rounded-2xl border overflow-hidden max-w-full min-w-0 ${isSidebar ? 'border-gray-200 bg-white shadow-sm' : 'border-primary-200 bg-primary-50/50'}`}>
      {!isSidebar && (
        <div className="px-5 py-4 bg-gradient-to-r from-primary-100 to-primary-200 border-b border-primary-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 flex-shrink-0 text-primary-600" aria-hidden />
            План питания
          </h3>
        </div>
      )}
      <div className={isSidebar ? 'p-3 sm:p-4 max-w-full min-w-0 overflow-x-hidden' : 'p-5 bg-white/70'}>
      {/* Дневная норма и БЖУ — градиент как на референсе (светлый голубовато-серый) */}
      <div className="rounded-xl p-4 mb-4 bg-gradient-to-b from-slate-50/95 to-gray-50/90 border border-gray-200/80 shadow-sm">
        <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block mb-1">Дневная норма</p>
        <p className="text-2xl font-bold text-gray-900">
          {(caloriesForUi?.total ?? regularDay.total_kcal ?? Math.round(plan.daily_calories))} ккал
        </p>

        {/* БЖУ за день — белок, жир, углеводы + круговая диаграмма соотношения */}
        {componentsForUi?.length > 0 && (() => {
          const dailyNutrition = dailyNutritionForUi || regularDay?.daily_nutrition;
          let proteinG = dailyNutrition?.protein?.grams ?? null;
          let fatG = dailyNutrition?.fat?.grams ?? null;
          let carbsG = dailyNutrition?.carbohydrate?.grams ?? dailyNutrition?.carbs?.grams ?? null;
          let proteinPct = dailyNutrition?.protein?.dmPct ?? null;
          let fatPct = dailyNutrition?.fat?.dmPct ?? null;
          let carbsPct = dailyNutrition?.carbohydrate?.dmPct ?? null;
          if (proteinG == null && !dailyNutrition?.protein) {
            const totals = { protein: 0, fat: 0, fiber: 0 };
            let totalGrams = 0;
            componentsForUi.forEach(c => {
              if (c.nutrition && c.daily_grams) {
                const grams = Number(c.daily_grams) || 0;
                const ratio = grams / 100;
                totalGrams += grams;
                totals.protein += (c.nutrition.protein || 0) * ratio;
                totals.fat += (c.nutrition.fat || 0) * ratio;
                totals.fiber += (c.nutrition.fiber || 0) * ratio;
              }
            });
            proteinG = Number(totals.protein.toFixed(1));
            fatG = Number(totals.fat.toFixed(1));
            if (totalGrams > 0) {
              const proteinAf = (totals.protein / totalGrams) * 100;
              const fatAf = (totals.fat / totalGrams) * 100;
              const fiberAf = (totals.fiber / totalGrams) * 100;
              const carbsAfPct = Math.max(0, 100 - proteinAf - fatAf - fiberAf);
              carbsG = Number((totalGrams * carbsAfPct / 100).toFixed(1));
              const sumPct = proteinAf + fatAf + carbsAfPct;
              if (sumPct > 0) {
                proteinPct = (proteinAf / sumPct) * 100;
                fatPct = (fatAf / sumPct) * 100;
                carbsPct = (carbsAfPct / sumPct) * 100;
              }
            }
          }
          if (carbsPct == null && proteinPct != null && fatPct != null) {
            carbsPct = Math.max(0, 100 - proteinPct - fatPct);
          }
          if (proteinPct == null && proteinG != null && fatG != null && carbsG != null) {
            const sumG = proteinG + fatG + (carbsG || 0);
            if (sumG > 0) {
              proteinPct = (proteinG / sumG) * 100;
              fatPct = (fatG / sumG) * 100;
              carbsPct = ((carbsG || 0) / sumG) * 100;
            }
          }
          const totalPct = (proteinPct || 0) + (fatPct || 0) + (carbsPct || 0);
          const chartData = (proteinPct != null && fatPct != null && carbsPct != null && totalPct > 0)
            ? {
                labels: ['Белок', 'Жир', 'Углеводы'],
                datasets: [{
                  data: [
                    Number(proteinPct.toFixed(1)),
                    Number(fatPct.toFixed(1)),
                    Number(carbsPct.toFixed(1)),
                  ],
                  backgroundColor: ['#2563eb', '#e5a41e', '#9ca3af'],
                  borderWidth: 6,
                  borderColor: '#ffffff',
                  hoverBorderWidth: 8,
                  hoverBorderColor: '#ffffff',
                  // Лёгкий «взрыв» сегментов — отступ от центра для объёмного вида
                  offset: [4, 4, 4],
                }],
              }
            : null;

          return (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block mb-2">Питательные вещества (день)</p>
              {/* Диаграмма; при наведении — подсказка с белками, жирами, углеводами */}
              {chartData && (
                <div className="flex justify-center mb-4 w-full min-w-0 px-1">
                  <div
                    className="relative w-36 h-36 sm:w-48 sm:h-48 max-w-full flex items-center justify-center mx-auto"
                    style={{
                      filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.22)) drop-shadow(0 12px 24px rgba(0,0,0,0.16)) drop-shadow(0 6px 12px rgba(0,0,0,0.1)) drop-shadow(0 2px 4px rgba(0,0,0,0.06))',
                      transform: 'perspective(280px) rotateX(8deg) rotateY(-2deg)',
                    }}
                  >
                    <Pie
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          tooltip: {
                            enabled: true,
                            titleFont: { size: 12, weight: 'bold' },
                            bodyFont: { size: 12 },
                            callbacks: {
                              title: () => 'Питательные вещества (день)',
                              label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toFixed(1)}%`,
                            },
                          },
                          legend: { display: false },
                        },
                        layout: { padding: 6 },
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Окошки БЖУ — оконтовка в цветах диаграммы (#2563eb, #e5a41e, #9ca3af) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs min-w-0">
                <div className="rounded-xl p-1.5 sm:p-2.5 text-center border-2 border-[#2563eb] bg-blue-100/90 shadow-sm min-w-0">
                  <p className="font-semibold text-gray-900 text-[11px] sm:text-sm tabular-nums">{proteinG != null ? `${proteinG}г` : '—'}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-900 leading-tight">Белок</p>
                </div>
                <div className="rounded-xl p-1.5 sm:p-2.5 text-center border-2 border-[#e5a41e] bg-amber-100/90 shadow-sm min-w-0">
                  <p className="font-semibold text-gray-900 text-[11px] sm:text-sm tabular-nums">{fatG != null ? `${fatG}г` : '—'}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-900 leading-tight">Жир</p>
                </div>
                <div className="rounded-xl p-1.5 sm:p-2.5 text-center border-2 border-[#9ca3af] bg-slate-100/90 shadow-sm min-w-0">
                  <p className="font-semibold text-gray-900 text-[11px] sm:text-sm tabular-nums">{carbsG != null ? `${carbsG}г` : '—'}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-900 leading-tight">Углеводы</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      
      {/* Дневное расписание кормления — по референсу: карточки с пунктиром, пилюли, иконки, граммы синим */}
      {componentsForUi?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block uppercase tracking-wide mb-3">
            Дневное расписание кормления
          </p>
          <div className="rounded-xl border-2 border-amber-300/70 bg-gradient-to-b from-blue-50/90 to-slate-50/80 shadow-sm overflow-hidden">
            {(() => {
              const dryFood = componentsForUi.find(c => c.product_type?.includes('dry'));
              const wetFood = componentsForUi.find(c => c.product_type?.includes('wet'));
              const slots = [
                { time: '08:00', label: 'Завтрак', type: 'dry' },
                { time: '13:00', label: 'Обед', type: 'wet' },
                { time: '18:00', label: 'Ужин', type: 'dry' },
                { time: '22:00', label: 'На ночь', type: 'wet' },
              ];
              const schedule = slots.map(({ time, label, type }) => {
                const food = type === 'dry' ? dryFood : wetFood;
                const fallback = type === 'dry' ? wetFood : dryFood;
                const source = food || fallback;
                if (!source) return null;
                const dailyG = source.daily_grams || 0;
                const isDry = (source.product_type || '').includes('dry');
                const share = (dryFood && wetFood) ? 0.5 : 0.25;
                const portion = Math.round(dailyG * share);
                const kcalPer100 = source.kcal_per_100g || (isDry ? 350 : 95);
                return {
                  time,
                  label,
                  product: source.product_name || (isDry ? 'Сухой корм' : 'Влажный корм'),
                  type: isDry ? 'dry' : 'wet',
                  grams: portion,
                  kcal: Math.round(portion * kcalPer100 / 100),
                };
              }).filter(Boolean);
              const pillClass = (label) => {
                if (label === 'Завтрак' || label === 'Ужин' || label === 'На ночь') return 'bg-amber-50/90 text-amber-800 border border-amber-200/60';
                if (label === 'Обед') return 'bg-blue-50/90 text-blue-800 border border-blue-200/60';
                return 'bg-gray-100/80 text-gray-800 border border-gray-200';
              };
              return schedule.map((meal, i) => (
                <div key={i} className="relative">
                  {i > 0 && <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-amber-400/80" aria-hidden />}
                  <div className="p-2.5 sm:p-3 flex flex-col gap-2 min-w-0 bg-gradient-to-b from-white/70 to-blue-50/30">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 shrink-0">{meal.time}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${pillClass(meal.label)}`}>
                        {meal.label}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 min-w-0">
                      {meal.type === 'dry' ? (
                        <Package className="w-4 h-4 shrink-0 text-red-500/90 mt-0.5" aria-hidden />
                      ) : (
                        <Circle className="w-3.5 h-3.5 shrink-0 fill-amber-700/80 text-amber-700/80 mt-0.5" aria-hidden />
                      )}
                      <p className="text-sm text-gray-800 break-words min-w-0 flex-1 leading-snug">
                        {meal.product}
                        <span className="text-gray-600">{meal.type === 'dry' ? ' (сухой)' : ' (влажный)'}</span>
                      </p>
                      <span className="text-sm shrink-0 tabular-nums">
                        <span className="font-bold text-blue-600">{meal.grams}</span>
                        <span className="text-gray-600"> г</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block mt-0.5" aria-hidden />
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
      
      {/* Лакомства (между кормлениями) — по референсу: заголовок, кость, частота пилюлями, подсказка с MapPin */}
      {(() => {
        const treatComp = componentsForUi?.find(c => c.product_type === 'treat');
        if (!treatComp && !treats) return null;
        const productName = treatComp?.product_name?.split(' ').slice(0, 4).join(' ') || 'Лакомства';
        const baseDailyGrams = treatComp?.daily_grams || treats?.daily_grams;
        const basePiecesPerDay = treatComp?.pieces_per_day || treats?.pieces_per_day || (baseDailyGrams ? Math.max(1, Math.round(baseDailyGrams / 10)) : null);
        const frequencyDays = treatFrequencyDays || treatComp?.treat_frequency_days || treats?.frequency_days || 2;
        const gramsPerTreatDay = baseDailyGrams ? Math.round(baseDailyGrams * frequencyDays) : null;
        const piecesPerTreatDay = basePiecesPerDay ? Math.max(1, Math.round(basePiecesPerDay * frequencyDays)) : null;
        const frequencyOptions = [
          { days: 1, label: 'Ежедневно' },
          { days: 3, label: 'Раз в 3 дн.' },
          { days: 7, label: 'Раз в 7 дн.' },
          { days: 2, label: 'Раз в 2 дн.' },
        ];
        return (
          <div className="mb-4">
            <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block uppercase tracking-wide mb-3">
              Лакомства (между кормлениями)
            </p>
            <div className="p-3 rounded-xl bg-gradient-to-b from-slate-50/95 to-gray-50/90 border-2 border-amber-300/70 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Bone className="w-4 h-4 shrink-0 text-amber-700/90" aria-hidden />
                <span className="text-sm font-medium text-gray-800 line-clamp-1 flex-1 min-w-0">{productName}</span>
                <span className="text-sm text-gray-700 shrink-0">
                  {gramsPerTreatDay != null && <span className="font-medium text-gray-800">{gramsPerTreatDay}</span>}
                  {gramsPerTreatDay != null && <span className="text-gray-500">г</span>}
                  {gramsPerTreatDay != null && piecesPerTreatDay != null && ' — '}
                  {piecesPerTreatDay != null && `${piecesPerTreatDay} шт`}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-gray-700">Частота:</span>
                <div className="flex flex-wrap gap-2">
                  {frequencyOptions.map(({ days, label }) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => onTreatFrequencyChange?.(days)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        frequencyDays === days
                          ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-700 mt-3 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" aria-hidden />
                <span className="font-medium">Распределить в течение дня, не более 10% от суточной нормы</span>
              </p>
              <div className="mt-4 pt-3 border-t-2 border-dashed border-amber-400/80">
                <PdfDownloadButton plan={plan} pet={pet} selectedComponents={componentsForUi} treatFrequencyDays={treatFrequencyDays} variant="secondary" />
              </div>
            </div>
          </div>
        );
      })()}
      
      {!isSidebar && (
      /* Добавки - только активные */
      (() => {
        const suppList = supplementsForUi.length > 0
          ? supplementsForUi.map((s, index) => ({
              product: s.product_name,
              dosage: s.dosage_text || 'По инструкции',
              time: s.intake_time || supplementSlots[index % supplementSlots.length] || 'с едой',
              instructions: s.intake_instructions,
            }))
          : [];
        
        if (suppList.length === 0) return null;
        
        return (
          <div className="mb-4">
            <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block uppercase tracking-wide mb-2">
              Добавки и витамины
            </p>
            <div className="space-y-2">
              {suppList.map((supp, i) => (
                <div key={i} className="p-2.5 bg-primary-50 border border-primary-100 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-primary-700 font-medium flex items-center gap-1">
                      💊 {supp.product?.split(' ').slice(0, 4).join(' ') || 'Добавка'}
                    </span>
                    <span className="text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                      {supp.dosage}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>⏰ {supp.time}</span>
                    {supp.instructions && <span>• {supp.instructions}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()
      )}
      
      {!isSidebar && (
      <>
      {/* Советы */}
      {tips.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
            <Info className="w-3 h-3 text-accent-600 shrink-0" />
            <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Советы</span>
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
            <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
              <Zap className="w-3 h-3 text-accent-500 shrink-0" />
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Активный день</span>
            </span>
            <span className="text-xs text-green-600 font-medium">
              +{plan.active_day.extra_percent}%
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {plan.active_day.total_kcal} ({plan.active_day.note})
          </p>
        </div>
      )}
      
      {/* Кнопка PDF (на мобильном блок плана может быть отдельно) */}
      <PdfDownloadButton plan={plan} pet={pet} selectedComponents={componentsForUi} treatFrequencyDays={treatFrequencyDays} />
      </>
      )}
      </div>
    </div>
  );
};

// ============================================================================
// ГЛАВНЫЙ КОМПОНЕНТ СТРАНИЦЫ
// ============================================================================
export default function FoodRecommendationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Состояние
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Настройки плана
  const [feedingType, setFeedingType] = useState('multi');
  const [multiRatioPreset, setMultiRatioPreset] = useState('balanced');
  const [planVariant, setPlanVariant] = useState('basic');
  const [period, setPeriod] = useState(14);
  
  // Данные плана
  const [feedingPlan, setFeedingPlan] = useState(null);
  const [treatFrequencyDays, setTreatFrequencyDays] = useState(2);
  
  // Компоненты рациона с альтернативами
  // { type: 'dry_food', alternatives: [...], currentIndex: 0 }
  const [componentStates, setComponentStates] = useState({});
  const [supplementPool, setSupplementPool] = useState([]);
  const [isSuppPoolLoading, setIsSuppPoolLoading] = useState(false);
  const [treatPool, setTreatPool] = useState([]);
  const [isTreatPoolLoading, setIsTreatPoolLoading] = useState(false);
  const [restoreState, setRestoreState] = useState(null);
  const restoreAppliedRef = useRef(false);
  
  // Загрузка питомцев
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await getPets();
        const petsList = response.pets || response.data?.pets || [];
        const completedPets = petsList.filter(p => (p.weight_kg || p.weight));
        setPets(completedPets);
        
        // Если есть сохранённое состояние конструктора
        let parsedDietState = null;
        const dietStateKey = searchParams.get('diet_state');
        if (dietStateKey) {
          const stored = sessionStorage.getItem(`diet_state:${dietStateKey}`);
          if (stored) {
            try {
              parsedDietState = JSON.parse(stored);
              setRestoreState(parsedDietState);
              if (parsedDietState?.feedingType) setFeedingType(parsedDietState.feedingType);
              if (parsedDietState?.multiRatioPreset) setMultiRatioPreset(parsedDietState.multiRatioPreset);
              if (parsedDietState?.planVariant) setPlanVariant(parsedDietState.planVariant);
              if (parsedDietState?.period) setPeriod(parsedDietState.period);
            } catch (e) {
              console.warn('Не удалось восстановить состояние конструктора', e);
            }
          }
        }

        // Если указан pet_id в URL
        const petIdFromUrl = searchParams.get('pet_id');
        const petIdToSelect = parsedDietState?.selectedPetId || petIdFromUrl;
        if (petIdToSelect) {
          const pet = completedPets.find(p => p.id === petIdToSelect);
          if (pet) {
            setSelectedPet(pet);
          } else {
            try {
              const petResponse = await getPet(petIdToSelect);
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
        
        const params = {
          food_type: feedingType,
          variant: planVariant,
          period_days: period,
        };
        if (feedingType === 'multi' && multiRatioPreset) {
          params.multi_ratio_preset = multiRatioPreset;
        }
        const response = await getFeedingPlan(selectedPet.id, params);
        
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
        
        // Добавляем только основную добавку (по умолчанию одна)
        if (plan.supplements?.length > 0) {
          const primarySupp = plan.supplements[0];
          states['supplement_0'] = {
            alternatives: [primarySupp],
            currentIndex: 0
          };
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
  }, [selectedPet, feedingType, multiRatioPreset, planVariant, period]);

  useEffect(() => {
    if (feedingPlan?.regular_day?.treats?.frequency_days) {
      setTreatFrequencyDays(feedingPlan.regular_day.treats.frequency_days);
    }
  }, [feedingPlan]);

  // Загрузка каталога добавок для продвинутого набора
  useEffect(() => {
    if (!selectedPet || planVariant !== 'advanced') {
      setSupplementPool([]);
      return;
    }

    let isMounted = true;
    const loadSupplements = async () => {
      try {
        setIsSuppPoolLoading(true);
        const catResp = await getCategories({ animal_type: selectedPet.species, tree: true });
        const categories = catResp.data || catResp;
        const supplementsCategory = findCategoryByCode(categories, 'food.supplements');

        let productsResp;
        if (supplementsCategory?.id) {
          productsResp = await getProductsV2({
            category_id: supplementsCategory.id,
            animal_type: selectedPet.species,
            per_page: 60,
          });
        } else {
          productsResp = await getProductsV2({
            product_group: 'vitamins',
            animal_type: selectedPet.species,
            per_page: 60,
          });
        }

        const rawProducts = productsResp?.data?.results || productsResp?.results || productsResp?.data?.products || productsResp?.products || [];
        const mapped = rawProducts.map(mapProductToSupplementComponent);

        if (isMounted) {
          setSupplementPool(mapped);
        }
      } catch (e) {
        console.error('Ошибка загрузки добавок:', e);
        if (isMounted) setSupplementPool([]);
      } finally {
        if (isMounted) setIsSuppPoolLoading(false);
      }
    };

    loadSupplements();
    return () => {
      isMounted = false;
    };
  }, [selectedPet, planVariant]);

  // Загрузка каталога лакомств для кнопки «Добавить лакомство»
  useEffect(() => {
    if (!selectedPet) {
      setTreatPool([]);
      return;
    }
    let isMounted = true;
    const loadTreats = async () => {
      try {
        setIsTreatPoolLoading(true);
        const catResp = await getCategories({ animal_type: selectedPet.species, tree: true });
        const categories = catResp.data || catResp;
        const treatsCategory = findCategoryByCode(categories, 'food.treats') || findCategoryByCode(categories, 'treats');
        let productsResp;
        if (treatsCategory?.id) {
          productsResp = await getProductsV2({
            category_id: treatsCategory.id,
            animal_type: selectedPet.species,
            per_page: 60,
          });
        } else {
          productsResp = await getProductsV2({
            product_group: 'treats',
            animal_type: selectedPet.species,
            per_page: 60,
          });
        }
        const rawProducts = productsResp?.data?.results || productsResp?.results || productsResp?.data?.products || productsResp?.products || [];
        const mapped = rawProducts.map(mapProductToTreatComponent);
        if (isMounted) setTreatPool(mapped);
      } catch (e) {
        console.error('Ошибка загрузки лакомств:', e);
        if (isMounted) setTreatPool([]);
      } finally {
        if (isMounted) setIsTreatPoolLoading(false);
      }
    };
    loadTreats();
    return () => { isMounted = false; };
  }, [selectedPet]);

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
          const typeMatches = altType.startsWith(expType) || altType === expType;
          return typeMatches && isComponentTypeCompatible(componentType, alt);
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

  // Восстановление выбранных альтернатив после возврата из карточки товара
  useEffect(() => {
    if (!restoreState || restoreAppliedRef.current) return;
    if (!componentStates || Object.keys(componentStates).length === 0) return;

    let updated = false;
    let pending = false;
    const next = { ...componentStates };
    const selections = restoreState.componentSelections || {};

    Object.entries(selections).forEach(([type, productId]) => {
      const state = componentStates[type];
      if (!state) return;
      const idx = state.alternatives.findIndex(a => a.product_id === productId);
      if (idx >= 0) {
        if (idx !== state.currentIndex) {
          next[type] = { ...state, currentIndex: idx };
          updated = true;
        }
      } else {
        pending = true;
      }
    });

    if (updated) {
      setComponentStates(next);
    }

    if (!pending) {
      restoreAppliedRef.current = true;
    }
  }, [componentStates, restoreState]);
  
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

  const handleAddSupplement = useCallback(() => {
    if (planVariant !== 'advanced') return;
    if (!supplementPool.length) return;

    const existingSupplementKeys = Object.keys(componentStates).filter((key) => key.startsWith('supplement_'));
    if (existingSupplementKeys.length >= 3) return;

    const selectedIds = new Set(
      existingSupplementKeys.map((key) => componentStates[key]?.alternatives?.[componentStates[key].currentIndex]?.product_id).filter(Boolean)
    );

    const available = supplementPool.filter((item) => !selectedIds.has(item.product_id));
    if (available.length === 0) return;

    let nextIndex = 0;
    while (componentStates[`supplement_${nextIndex}`]) {
      nextIndex += 1;
    }

    const alternatives = available.map((item) => ({
      ...item,
      supplement_type: item.supplement_type || inferSupplementTypeFromName(item.product_name),
    }));
    const currentIndex = 0;

    setComponentStates((prev) => ({
      ...prev,
      [`supplement_${nextIndex}`]: {
        alternatives,
        currentIndex,
      },
    }));
  }, [planVariant, supplementPool, componentStates]);

  const handleRemoveSupplement = useCallback((componentType) => {
    setComponentStates((prev) => {
      const next = { ...prev };
      delete next[componentType];
      return next;
    });
  }, []);

  const handleRemoveTreat = useCallback(() => {
    setComponentStates((prev) => {
      const next = { ...prev };
      delete next.treat;
      return next;
    });
  }, []);

  const handleAddTreat = useCallback(() => {
    if (!treatPool.length) return;
    if (componentStates.treat) return;
    const alternatives = treatPool.map((item) => ({
      ...item,
      treat_frequency_days: item.treat_frequency_days ?? 2,
    }));
    setComponentStates((prev) => ({
      ...prev,
      treat: {
        alternatives,
        currentIndex: 0,
      },
    }));
  }, [treatPool, componentStates.treat]);

  // Получение текущих компонентов для отображения
  const currentComponents = Object.entries(componentStates).map(([type, state]) => {
    const filteredAlternatives = state.alternatives.filter(alt => isComponentTypeCompatible(type, alt));
    const rawAlternatives = filteredAlternatives.length > 0 ? filteredAlternatives : state.alternatives;
    const displayAlternatives = rawAlternatives.map((item) =>
      item?.product_type === 'treat'
        ? adjustTreatComponentForFrequency(item, treatFrequencyDays, period)
        : item
    );
    const displayIndexMap = displayAlternatives.map((item) => (
      state.alternatives.findIndex(a => a.product_id === item.product_id)
    ));
    const displayIndex = displayIndexMap.indexOf(state.currentIndex);
    const fallbackIndex = displayIndex >= 0 ? displayIndex : 0;

    return {
      type,
      component: displayAlternatives[fallbackIndex],
      alternatives: displayAlternatives,
      currentIndex: fallbackIndex,
      displayIndexMap,
    };
  });
  
  // Расчёт общей стоимости выбранных компонентов
  const totalCost = currentComponents.reduce((sum, entry) => {
    const current = entry.component;
    if (!current?.price) return sum;
    const price = parseFloat(current.price);
    const packages = current.packages_needed || 1;
    return sum + (price * packages);
  }, 0);
  
  // Добавление в корзину
  const handleAddToCart = async () => {
    try {
      for (const entry of currentComponents) {
        const component = entry.component;
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

  const saveDietState = useCallback(() => {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const componentSelections = {};
    Object.entries(componentStates).forEach(([type, state]) => {
      const current = state.alternatives[state.currentIndex];
      if (current?.product_id) {
        componentSelections[type] = current.product_id;
      }
    });

    const payload = {
      selectedPetId: selectedPet?.id || null,
      feedingType,
      multiRatioPreset: feedingType === 'multi' ? multiRatioPreset : undefined,
      planVariant,
      period,
      componentSelections,
    };

    sessionStorage.setItem(`diet_state:${token}`, JSON.stringify(payload));
    return token;
  }, [componentStates, selectedPet, feedingType, multiRatioPreset, planVariant, period]);

  const buildReturnTo = useCallback(() => {
    const params = new URLSearchParams(location.search);
    params.delete('diet_state');
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ''}`;
  }, [location.pathname, location.search]);

  const handleOpenProduct = useCallback((component) => {
    if (!component?.product_id) return;
    const token = saveDietState();
    const returnBase = buildReturnTo();
    const returnTo = `${returnBase}${returnBase.includes('?') ? '&' : '?'}diet_state=${token}`;
    const productUrl = `/shop/products/${component.product_id}?return_to=${encodeURIComponent(returnTo)}`;
    navigate(productUrl);
  }, [saveDietState, buildReturnTo, navigate]);
  
  // Загрузка
  if (isLoading) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
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
          <h2 className="section-title text-gray-800 mb-2">
            Для подбора корма нужен профиль питомца
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            Создайте профиль питомца с указанием веса для персонализированного подбора рациона.
          </p>
          <button
            onClick={() => navigate('/pet-id')}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-500 text-white rounded-xl 
                       font-medium hover:shadow-lg transition-all"
          >
            Создать PetID
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container animate-fadeIn pb-8 w-full min-w-0 max-w-full overflow-x-hidden">
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
          className="mb-6 p-4 bg-secondary-50 border border-secondary-200 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-secondary-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-secondary-800">
              Профиль заполнен на {selectedPet.profile_completeness || 0}%
            </p>
            <p className="text-sm text-secondary-700 mt-1">
              Для более точного подбора заполните информацию о здоровье и аллергиях.
            </p>
            <button 
              onClick={() => navigate(`/pets/${selectedPet.id}/edit`)}
              className="mt-2 text-sm text-secondary-600 hover:text-secondary-800 font-medium"
            >
              Заполнить профиль →
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Основной контент: на мобильных сначала блок «Расчёт рациона», затем подбор и конструктор */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0 max-w-full">
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1 min-w-0 max-w-full">
          {/* Подбор корма — градиент по референсу (оранжево-жёлтый → бледно-жёлтый) */}
          <div className="rounded-2xl border border-amber-200/80 overflow-hidden bg-amber-50/30 max-w-full min-w-0">
            <div className="rounded-t-2xl px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#F6B537] via-[#FDE28F] to-[#FEE9AE] border-b border-amber-200/60">
              <h1 className="text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-800" aria-hidden />
                Подбор корма
              </h1>
            </div>
            <div className="p-4 sm:p-7 overflow-x-hidden bg-white/90">
              <h2 className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block uppercase tracking-wide mb-4">
                Параметры подбора
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 overflow-x-hidden rounded-xl p-3 sm:p-4 bg-[#F8F8F8]/60 border border-gray-100 min-w-0 max-w-full">
                <div className="space-y-1">
                  <PetDropdown 
                    pets={pets} 
                    selectedPet={selectedPet} 
                    onSelect={setSelectedPet}
                    isLoading={isPlanLoading}
                  />
                  {selectedPet && (selectedPet.profile_completeness ?? 0) < 100 && (
                    <p className="text-sm text-amber-800/90">
                      Для более качественного подбора заполните pet id до конца.
                    </p>
                  )}
                </div>
                <SelectDropdown
                  label="Тип питания"
                  options={FEEDING_TYPE_OPTIONS}
                  value={feedingType}
                  onChange={setFeedingType}
                  disabled={isPlanLoading}
                />
                <PeriodInput
                  value={period}
                  onChange={setPeriod}
                  disabled={isPlanLoading}
                />
                {feedingType === 'multi' && selectedPet ? (
                  <RatioSlider
                    options={getMultiRatioPresetOptions(selectedPet.species)}
                    value={multiRatioPreset}
                    onChange={setMultiRatioPreset}
                    disabled={isPlanLoading}
                  />
                ) : (
                  <div aria-hidden="true" />
                )}
              </div>
            </div>
          </div>
          
          {/* Конструктор рациона — градиент по референсу (оранжево-жёлтый → бледно-жёлтый); контент размыт, пока не выбран питомец */}
          <div className="rounded-2xl border border-amber-200/80 overflow-hidden bg-amber-50/30 max-w-full min-w-0">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#F6B537] via-[#FDE28F] to-[#FEE9AE] border-b border-amber-200/60">
              <h3 className="text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-800" aria-hidden />
                Конструктор рациона
              </h3>
            </div>
            <div className="relative min-w-0 max-w-full">
              <div className="p-4 sm:p-6 bg-white/80 overflow-x-hidden">
              {/* Переключатель Базовый / Продвинутый */}
              <div className="mb-6">
                <VariantToggle
                  value={planVariant}
                  onChange={setPlanVariant}
                  disabled={isPlanLoading}
                />
              </div>
              
              {isPlanLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
                    <p className="text-sm text-gray-500">
                      Подбираем корм для вашего питомца
                    </p>
                  </div>
                </div>
              )}
              
              {/* Компоненты */}
              {!isPlanLoading && currentComponents.length > 0 && (
                <div className="space-y-4">
                  {(() => {
                    const foodComponents = currentComponents.filter(({ type }) => !type.startsWith('supplement_'));
                    const supplementComponents = currentComponents
                      .filter(({ type }) => type.startsWith('supplement_'))
                      .sort((a, b) => {
                        const ai = parseInt(a.type.split('_')[1] || '0', 10);
                        const bi = parseInt(b.type.split('_')[1] || '0', 10);
                        return ai - bi;
                      });
                    return (
                      <>
                        {foodComponents.map(({ type, component, alternatives, currentIndex, displayIndexMap }) => (
                          <RationComponentCard
                            key={type}
                            component={component}
                            alternatives={alternatives}
                            currentIndex={currentIndex}
                            onChangeIndex={(idx) => handleChangeComponentIndex(type, displayIndexMap[idx] ?? idx)}
                            isLoading={isPlanLoading}
                            componentType={type}
                            onProductClick={handleOpenProduct}
                            showRemove={type === 'treat'}
                            onRemove={type === 'treat' ? handleRemoveTreat : undefined}
                            removeButtonRight={type === 'treat'}
                            calorieDistribution={feedingPlan?.calorie_distribution}
                            dailyCalories={feedingPlan?.daily_calories}
                            accentVariant={planVariant === 'advanced' ? 'purple' : 'amber'}
                          />
                        ))}

                        {!foodComponents.some(({ type }) => type === 'treat') && (
                          <div className="pt-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <span className="text-lg">🦴</span>
                              Лакомства
                            </div>
                            <button
                              type="button"
                              onClick={handleAddTreat}
                              disabled={isTreatPoolLoading || treatPool.length === 0}
                              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-lg leading-none">＋</span>
                              Добавить лакомство
                            </button>
                            {isTreatPoolLoading && (
                              <span className="ml-3 text-xs text-gray-400">загружаем каталог...</span>
                            )}
                          </div>
                        )}

                        {planVariant === 'advanced' && supplementComponents.length > 0 && (
                          <div className="pt-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <span className="text-lg">💊</span>
                              Витамины и добавки
                            </div>
                            <div className="space-y-3">
                              {supplementComponents.map(({ type, component, alternatives, currentIndex, displayIndexMap }, idx) => (
                                <RationComponentCard
                                  key={type}
                                  component={component}
                                  alternatives={alternatives}
                                  currentIndex={currentIndex}
                                  onChangeIndex={(idx) => handleChangeComponentIndex(type, displayIndexMap[idx] ?? idx)}
                                  isLoading={isPlanLoading}
                                  componentType={type}
                                  onProductClick={handleOpenProduct}
                                  labelOverride={getSupplementLabel(component)}
                                  showRemove
                                  onRemove={() => handleRemoveSupplement(type)}
                                  calorieDistribution={feedingPlan?.calorie_distribution}
                                  dailyCalories={feedingPlan?.daily_calories}
                                  accentVariant="purple"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {planVariant === 'advanced' && supplementComponents.length === 0 && (
                          <div className="pt-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <span className="text-lg">💊</span>
                              Витамины и добавки
                            </div>
                            <div className="text-sm text-gray-500 mb-3">
                              Добавьте витамины и добавки по потребностям питомца (до 3 разных типов).
                            </div>
                          </div>
                        )}

                        {planVariant === 'advanced' && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleAddSupplement}
                              disabled={isSuppPoolLoading || supplementComponents.length >= 3 || supplementPool.length === 0}
                              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg font-medium bg-gradient-to-r from-primary-100 via-primary-200/80 to-primary-300 text-primary-900 border border-primary-300/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_1px_2px_rgba(82,47,129,0.15)] hover:from-primary-200 hover:via-primary-300/90 hover:to-primary-400 hover:shadow-[0_2px_4px_rgba(82,47,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              <span className="text-lg leading-none">＋</span>
                              Добавить витамины
                            </button>
                            <span className="ml-3 text-xs text-gray-500">
                              {supplementComponents.length}/3
                            </span>
                            {isSuppPoolLoading && (
                              <span className="ml-3 text-xs text-gray-400">загружаем каталог...</span>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              
              {!isPlanLoading && currentComponents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Нет подходящих товаров</p>
                  <p className="text-sm mt-1">Попробуйте изменить параметры</p>
                </div>
              )}
              
              {/* Итого и кнопки — в пастельной палитре */}
              {!isPlanLoading && currentComponents.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-gray-900 mb-4 px-3 py-2 rounded-xl bg-[#F8F8F8] border border-gray-100">
                    Итого на {period} дней:
                    {totalCost > 0 && (
                      <span className="font-bold text-gray-900 ml-2">
                        {totalCost.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </p>
                  <button 
                    onClick={handleAddToCart}
                    disabled={isPlanLoading || totalCost === 0}
                    className="w-full py-3.5 bg-accent-500 hover:bg-accent-600 text-white 
                               rounded-xl font-medium transition-all flex items-center 
                               justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Добавить в корзину
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="w-full mt-3 py-2.5 rounded-xl border-2 border-primary-200 text-primary-700 
                               font-medium hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
                  >
                    Хотите выбрать сами?
                  </button>
                </div>
              )}
              </div>
              {!selectedPet && (
                <div className="absolute inset-0 rounded-b-2xl bg-white/50 backdrop-blur-md pointer-events-auto cursor-not-allowed z-10" aria-hidden />
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1 order-1 lg:order-2 min-w-0 max-w-full">
          <div className="rounded-2xl border border-amber-200/80 overflow-hidden bg-amber-50/30 max-w-full min-w-0">
            <div className="rounded-t-2xl px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#F6B537] via-[#FDE28F] to-[#FEE9AE] border-b border-amber-200/60">
              <h2 className="text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-amber-800" aria-hidden />
                Расчёт рациона
              </h2>
            </div>
            <div className="sticky top-3 md:top-24 min-w-0 max-w-full overflow-x-hidden">
              {selectedPet ? (
                <FeedingPlanBlock
                variant="sidebar"
                plan={feedingPlan}
                isLoading={isPlanLoading}
                selectedComponents={currentComponents.map(x => x.component).filter(Boolean)}
                treatFrequencyDays={treatFrequencyDays}
                onTreatFrequencyChange={setTreatFrequencyDays}
                pet={selectedPet}
              />
            ) : (
              <div className="relative rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <div className="p-4">
                  <div className="rounded-xl p-4 mb-4 bg-gradient-to-b from-slate-50/95 to-gray-50/90 border border-gray-200/80 shadow-sm">
                    <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block mb-1">Дневная норма</p>
                    <p className="text-2xl font-bold text-gray-900">— ккал</p>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block mb-2">Питательные вещества (день)</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl p-2.5 text-center border-2 border-[#2563eb] bg-blue-100/90 shadow-sm">
                          <p className="font-semibold text-gray-900">— г</p>
                          <p className="text-[10px] text-gray-900">Белок</p>
                        </div>
                        <div className="rounded-xl p-2.5 text-center border-2 border-[#e5a41e] bg-amber-100/90 shadow-sm">
                          <p className="font-semibold text-gray-900">— г</p>
                          <p className="text-[10px] text-gray-900">Жир</p>
                        </div>
                        <div className="rounded-xl p-2.5 text-center border-2 border-[#9ca3af] bg-slate-100/90 shadow-sm">
                          <p className="font-semibold text-gray-900">— г</p>
                          <p className="text-[10px] text-gray-900">Углеводы</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent inline-block uppercase tracking-wide mb-3">
                      Дневное расписание кормления
                    </p>
                    <div className="rounded-xl border-2 border-amber-300/70 bg-gradient-to-b from-blue-50/90 to-slate-50/80 shadow-sm overflow-hidden">
                      <div className="p-3 flex items-start gap-3 bg-gradient-to-b from-white/70 to-blue-50/30 border-b-2 border-dashed border-amber-400/80">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-sm font-bold text-gray-900">08:00</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50/90 text-amber-800 border border-amber-200/60">Завтрак</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Package className="w-4 h-4 shrink-0 text-red-500/90" />
                            <span className="text-sm text-gray-500">—</span>
                            <span className="text-sm"><span className="font-bold text-blue-600">—</span> г</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 flex items-start gap-3 bg-gradient-to-b from-white/70 to-blue-50/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-sm font-bold text-gray-900">13:00</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50/90 text-blue-800 border border-blue-200/60">Обед</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Circle className="w-3.5 h-3.5 shrink-0 fill-amber-700/80 text-amber-700/80" />
                            <span className="text-sm text-gray-500">—</span>
                            <span className="text-sm"><span className="font-bold text-blue-600">—</span> г</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-white/50 backdrop-blur-md pointer-events-auto z-10" aria-hidden />
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
