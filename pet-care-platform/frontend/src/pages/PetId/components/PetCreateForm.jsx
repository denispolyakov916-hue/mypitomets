/**
 * PetCreateForm - Форма создания PetID (Этап 1)
 * 
 * Одна страница со всеми полями:
 * 1. Фото (вверху)
 * 2. Имя
 * 3. Тип (собака/кошка)
 * 4. Пол
 * 5. Порода
 * 6. Возраст
 * 7. Вес
 * 8. Кастрация
 * 
 * После нажатия "Добавить питомца" → сохранение + триггер → Этап 2
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Camera, Dog, Cat, Search, AlertCircle, CheckCircle2, X, Loader2
} from 'lucide-react';
import { createPet, getBreeds } from '../../../api/pets';

// ============================================
// КОНСТАНТЫ
// ============================================

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Собака', icon: Dog, emoji: '🐕' },
  { value: 'cat', label: 'Кошка', icon: Cat, emoji: '🐱' },
];

const SEX_OPTIONS = [
  { value: 'male', label: 'Мальчик', symbol: '♂' },
  { value: 'female', label: 'Девочка', symbol: '♀' },
];

const NEUTERED_OPTIONS = [
  { value: true, label: 'Да', symbol: '✓' },
  { value: false, label: 'Нет', symbol: '✗' },
];

// Популярные породы для быстрого выбора
// Названия популярных пород для фильтрации из API
const POPULAR_DOG_BREED_NAMES = [
  'лабрадор', 'немецкая овчарка', 'йоркширский терьер', 'французский бульдог', 'золотистый ретривер'
];

const POPULAR_CAT_BREED_NAMES = [
  'британская', 'шотландская', 'мейн-кун', 'сиамская', 'персидская'
];

// Специальный вариант для метисов
const MIXED_BREED_DOG = { id: 'mixed', name: 'Дворняга / Метис', isMixed: true };
const MIXED_BREED_CAT = { id: 'mixed', name: 'Беспородная / Метис', isMixed: true };

// Диапазоны веса по породам (для подсказки)
const initialFormState = {
  photo: null,
  photoPreview: null,
  name: '',
  species: '',
  sex: '',
  breed: '',
  breedId: null,
  isMixed: false,
  ageType: 'approximate', // 'exact' | 'approximate'
  dateOfBirth: null,
  ageYears: '',
  ageMonths: '',
  weightKg: '',
  isNeutered: null,
};

// ============================================
// КОМПОНЕНТЫ ПОЛЕЙ
// ============================================

// Загрузка фото
const PhotoUpload = ({ photo, photoPreview, onChange, species }) => {
  const fileInputRef = useRef(null);
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 5 МБ.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ photo: file, photoPreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const getPlaceholder = () => {
    if (species === 'dog') return '🐕';
    if (species === 'cat') return '🐱';
    return '🐾';
  };
  
  return (
    <div className="flex flex-col items-center mb-8">
      <div 
        onClick={handleClick}
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 
                   flex items-center justify-center cursor-pointer border-4 border-white shadow-lg
                   hover:shadow-xl transition-all overflow-hidden group"
      >
        {photoPreview ? (
          <img src={photoPreview} alt="Pet" className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{getPlaceholder()}</span>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 
                        group-hover:opacity-100 transition-opacity">
          <Camera className="w-8 h-8 text-white" />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-sm text-gray-500 mt-2">
        {photoPreview ? 'Нажмите, чтобы изменить' : 'Добавить фото (необязательно)'}
      </p>
    </div>
  );
};

// Текстовое поле
const TextField = ({ label, value, onChange, placeholder, error, required }) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl border-2 transition-all
        ${error 
          ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
          : 'border-gray-200 focus:border-purple-500 focus:ring-purple-200'
        }
        focus:outline-none focus:ring-4`}
    />
    {error && (
      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" /> {error}
      </p>
    )}
  </div>
);

// Выбор из кнопок
const ButtonSelect = ({ label, options, value, onChange, error, required }) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="flex gap-3">
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 py-4 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
              ${isSelected 
                ? 'border-purple-500 bg-purple-50 text-purple-700' 
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
              }`}
          >
            {Icon && <Icon className={`w-8 h-8 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />}
            {option.emoji && <span className="text-3xl">{option.emoji}</span>}
            {option.symbol && <span className={`text-2xl font-bold ${isSelected ? 'text-purple-600' : 'text-gray-400'}`}>{option.symbol}</span>}
            <span className="font-medium">{option.label}</span>
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
    {error && (
      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" /> {error}
      </p>
    )}
  </div>
);

// Выбор породы с поиском
const BreedSelect = ({ species, value, breedId, isMixed, onChange, error, required, breeds, popularBreeds, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const listboxIdRef = useRef(`breed-select-listbox-${Math.random().toString(36).slice(2)}`);
  
  const mixedBreed = species === 'dog' ? MIXED_BREED_DOG : MIXED_BREED_CAT;
  
  // Debounced поиск при вводе
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, onSearch]);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelectBreed = (breed) => {
    const isMixedBreed = breed.isMixed || breed.id === 'mixed';
    onChange({
      breed: breed.name,
      breedId: isMixedBreed ? null : breed.id,
      isMixed: isMixedBreed,
    });
    setSearchQuery('');
    setIsOpen(false);
  };

  const dropdownOptions = useMemo(() => {
    if (!isOpen || value) return [];
    if (searchQuery && searchQuery.length >= 2) {
      const options = [...breeds];
      const shouldShowMixed =
        searchQuery.toLowerCase().includes('двор') ||
        searchQuery.toLowerCase().includes('метис') ||
        searchQuery.toLowerCase().includes('беспор');
      if (shouldShowMixed) options.push(mixedBreed);
      return options;
    }
    return [...popularBreeds, mixedBreed];
  }, [isOpen, value, searchQuery, breeds, popularBreeds, mixedBreed]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    if (dropdownOptions.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(0);
  }, [isOpen, dropdownOptions]);

  const moveActiveIndex = (delta) => {
    if (dropdownOptions.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return dropdownOptions.length - 1;
      if (next >= dropdownOptions.length) return 0;
      return next;
    });
  };
  
  if (!species) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Порода {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-400">
          Сначала выберите тип питомца
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Порода {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Выбранная порода или поле поиска */}
      <div className="relative">
        {value ? (
          <div 
            className={`w-full px-4 py-3 rounded-xl border-2 flex justify-between items-center cursor-pointer
              ${error ? 'border-red-300' : 'border-purple-500 bg-purple-50'}`}
            onClick={() => {
              onChange({ breed: '', breedId: null, isMixed: false });
              setIsOpen(true);
            }}
          >
            <span className="font-medium text-purple-700">{value}</span>
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Поиск породы..."
              className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all
                ${error 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-purple-500'
                }
                focus:outline-none focus:ring-4 focus:ring-purple-200`}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxIdRef.current}
              aria-activedescendant={
                activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
              }
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
                  if (dropdownOptions.length > 0) setActiveIndex(0);
                  return;
                }
                if (e.key === 'End') {
                  e.preventDefault();
                  if (dropdownOptions.length > 0) {
                    setActiveIndex(dropdownOptions.length - 1);
                  }
                  return;
                }
                if (e.key === 'Enter' && isOpen && activeIndex >= 0) {
                  e.preventDefault();
                  handleSelectBreed(dropdownOptions[activeIndex]);
                  return;
                }
                if (e.key === 'Escape' && isOpen) {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }
              }}
            />
          </div>
        )}
        
        {/* Выпадающий список */}
        {isOpen && !value && (
          <div
            className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
            id={listboxIdRef.current}
            role="listbox"
          >
            {searchQuery && searchQuery.length >= 2 ? (
              // Режим поиска - показываем результаты с сервера
              <>
                {breeds.length > 0 ? (
                  breeds.map((breed, index) => (
                    <button
                      key={breed.id}
                      type="button"
                      id={`${listboxIdRef.current}-opt-${index}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      tabIndex={-1}
                      onClick={() => handleSelectBreed(breed)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        activeIndex === index ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'
                      }`}
                    >
                      {breed.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    Порода не найдена
                  </div>
                )}
                {/* Показываем метис если запрос похож */}
                {(searchQuery.toLowerCase().includes('двор') || 
                  searchQuery.toLowerCase().includes('метис') ||
                  searchQuery.toLowerCase().includes('беспор')) && (
                  <button
                    type="button"
                    id={`${listboxIdRef.current}-opt-${breeds.length}`}
                    role="option"
                    aria-selected={activeIndex === breeds.length}
                    tabIndex={-1}
                    onClick={() => handleSelectBreed(mixedBreed)}
                    className={`w-full px-4 py-3 text-left transition-colors border-t border-gray-100 ${
                      activeIndex === breeds.length ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'
                    }`}
                  >
                    {mixedBreed.name}
                  </button>
                )}
              </>
            ) : (
              // Режим популярных пород
              <>
                {popularBreeds.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-gray-500 uppercase font-semibold bg-gray-50">
                      Популярные
                    </div>
                    {popularBreeds.map((breed, index) => (
                      <button
                        key={breed.id}
                        type="button"
                        id={`${listboxIdRef.current}-opt-${index}`}
                        role="option"
                        aria-selected={activeIndex === index}
                        tabIndex={-1}
                        onClick={() => handleSelectBreed(breed)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          activeIndex === index ? 'bg-purple-100 text-purple-700' : 'hover:bg-purple-50'
                        }`}
                      >
                        {breed.name}
                      </button>
                    ))}
                  </>
                )}
                {/* Всегда показываем вариант метиса */}
                <button
                  type="button"
                  id={`${listboxIdRef.current}-opt-${popularBreeds.length}`}
                  role="option"
                  aria-selected={activeIndex === popularBreeds.length}
                  tabIndex={-1}
                  onClick={() => handleSelectBreed(mixedBreed)}
                  className={`w-full px-4 py-3 text-left transition-colors border-t border-gray-100 ${
                    activeIndex === popularBreeds.length
                      ? 'bg-purple-100 text-purple-700'
                      : 'hover:bg-purple-50 text-gray-600'
                  }`}
                >
                  {mixedBreed.name}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Популярные породы как кнопки */}
      {!value && !isOpen && popularBreeds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {popularBreeds.slice(0, 4).map((breed) => (
            <button
              key={breed.id}
              type="button"
              onClick={() => handleSelectBreed(breed)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-purple-100 hover:text-purple-700 
                         rounded-full transition-colors"
            >
              {breed.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSelectBreed(mixedBreed)}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-purple-100 hover:text-purple-700 
                       rounded-full transition-colors"
          >
            {mixedBreed.name}
          </button>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
    </div>
  );
};

// Выбор возраста
const AgeSelect = ({ ageType, dateOfBirth, ageYears, ageMonths, onChange, error, required }) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Возраст {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Переключатель типа ввода */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="ageType"
            checked={ageType === 'exact'}
            onChange={() => onChange({ ageType: 'exact' })}
            className="w-4 h-4 text-purple-600"
          />
          <span className="text-sm">Точная дата рождения</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="ageType"
            checked={ageType === 'approximate'}
            onChange={() => onChange({ ageType: 'approximate' })}
            className="w-4 h-4 text-purple-600"
          />
          <span className="text-sm">Примерный возраст</span>
        </label>
      </div>
      
      {ageType === 'exact' ? (
        <DatePicker
          selected={dateOfBirth}
          onChange={(date) => onChange({ dateOfBirth: date })}
          dateFormat="dd.MM.yyyy"
          maxDate={new Date()}
          showYearDropdown
          scrollableYearDropdown
          yearDropdownItemNumber={20}
          placeholderText="Выберите дату"
          className={`w-full px-4 py-3 rounded-xl border-2 transition-all
            ${error 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-purple-500'
            }
            focus:outline-none focus:ring-4 focus:ring-purple-200`}
        />
      ) : (
        <div className="flex gap-4">
          <div className="flex-1">
            <select
              value={ageYears}
              onChange={(e) => onChange({ ageYears: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all
                ${error 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-purple-500'
                }
                focus:outline-none focus:ring-4 focus:ring-purple-200`}
            >
              <option value="">Годы</option>
              {[...Array(20)].map((_, i) => (
                <option key={i} value={i}>{i} {i === 1 ? 'год' : i < 5 ? 'года' : 'лет'}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={ageMonths}
              onChange={(e) => onChange({ ageMonths: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all
                ${error 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-purple-500'
                }
                focus:outline-none focus:ring-4 focus:ring-purple-200`}
            >
              <option value="">Месяцы</option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i}>{i} {i === 1 ? 'месяц' : i < 5 ? 'месяца' : 'месяцев'}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
    </div>
  );
};

// Ввод веса
const WeightInput = ({ value, onChange, error, required, selectedBreed, ageMonths, species }) => {
  // Рассчитываем подсказку веса с учётом возраста
  const getWeightHint = () => {
    if (!selectedBreed || !selectedBreed.min_weight || !selectedBreed.max_weight) {
      return null;
    }
    
    const minAdult = parseFloat(selectedBreed.min_weight);
    const maxAdult = parseFloat(selectedBreed.max_weight);
    const age = parseInt(ageMonths) || 24; // По умолчанию взрослый
    
    // Для щенков/котят корректируем ожидаемый вес
    if (age < 12) {
      // Грубая оценка: вес растёт примерно линейно до 12 месяцев
      const growthFactor = Math.max(0.3, age / 12);
      return {
        min: (minAdult * growthFactor).toFixed(1),
        max: (maxAdult * growthFactor).toFixed(1),
        label: selectedBreed.name,
        isYoung: true
      };
    }
    
    return {
      min: minAdult.toFixed(1),
      max: maxAdult.toFixed(1),
      label: selectedBreed.name,
      isYoung: false
    };
  };
  
  const weightHint = getWeightHint();
  
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Текущий вес {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          min="0.1"
          max={species === 'cat' ? 20 : 100}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (
              val === '' ||
              (parseFloat(val) >= 0 && parseFloat(val) <= (species === 'cat' ? 20 : 100))
            ) {
              onChange(val);
            }
          }}
          placeholder={species === 'cat' ? 'От 0.1 до 20 кг' : 'От 0.1 до 100 кг'}
          className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all
            ${error 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-purple-500'
            }
            focus:outline-none focus:ring-4 focus:ring-purple-200`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
          кг
        </span>
      </div>
      {weightHint && (
        <p className="mt-2 text-sm text-blue-600 flex items-center gap-1">
          💡 {weightHint.isYoung ? 'Ожидаемый вес' : 'Норма'} для {weightHint.label}: {weightHint.min}-{weightHint.max} кг
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
    </div>
  );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ ФОРМЫ
// ============================================

const PetCreateForm = ({ onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [breeds, setBreeds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Загрузка популярных пород при выборе типа питомца
  const [popularBreeds, setPopularBreeds] = useState([]);
  
  useEffect(() => {
    const loadPopularBreeds = async () => {
      if (!formData.species) {
        setPopularBreeds([]);
        setBreeds([]);
        return;
      }
      
      try {
        // Загружаем популярные породы для быстрого выбора
        const response = await getBreeds({ 
          species: formData.species, 
          popular_only: true,
          limit: 6
        });
        
        const breedsData = response?.breeds || [];
        setPopularBreeds(breedsData);
        setBreeds(breedsData); // Изначально показываем популярные
      } catch (error) {
        console.error('Error loading breeds:', error);
        setPopularBreeds([]);
        setBreeds([]);
      }
    };
    
    loadPopularBreeds();
  }, [formData.species]);

  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        modalRef.current.focus();
      }
    };

    const timeout = setTimeout(focusFirst, 10);

    return () => {
      clearTimeout(timeout);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus?.();
    };
  }, []);
  
  // Поиск пород по запросу
  const searchBreeds = useCallback(async (query) => {
    if (!formData.species) return;
    
    if (!query || query.length < 2) {
      // Возвращаем популярные породы
      setBreeds(popularBreeds);
      return;
    }
    
    try {
      const response = await getBreeds({ 
        species: formData.species, 
        search: query,
        limit: 10
      });
      setBreeds(response?.breeds || []);
    } catch (error) {
      console.error('Error searching breeds:', error);
    }
  }, [formData.species, popularBreeds]);
  
  // Обновление поля
  const updateField = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Очищаем ошибки для обновлённых полей
    const clearedErrors = {};
    Object.keys(updates).forEach(key => {
      clearedErrors[key] = undefined;
    });
    setErrors(prev => ({ ...prev, ...clearedErrors }));
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };
  
  // Валидация
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Введите кличку питомца. Поле обязательно для заполнения';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Кличка должна содержать минимум 2 символа';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Кличка не должна превышать 50 символов';
    }
    
    if (!formData.species) {
      newErrors.species = 'Выберите вид животного (собака или кошка)';
    }
    
    if (!formData.sex) {
      newErrors.sex = 'Выберите пол питомца из списка';
    }
    
    if (!formData.breed) {
      newErrors.breed = 'Выберите породу из списка или введите название';
    }
    
    if (formData.ageType === 'exact') {
      if (!formData.dateOfBirth) {
        newErrors.age = 'Укажите дату рождения питомца. Это необходимо для точных рекомендаций';
      }
    } else {
      if (formData.ageYears === '' && formData.ageMonths === '') {
        newErrors.age = 'Укажите возраст питомца (годы и/или месяцы)';
      }
    }
    
    if (!formData.weightKg || parseFloat(formData.weightKg) <= 0) {
      newErrors.weight = 'Введите вес питомца в килограммах (например: 5.5)';
    } else {
      const weight = parseFloat(formData.weightKg);
      if (weight < 0.3) {
        newErrors.weight = 'Вес не может быть меньше 0.3 кг. Проверьте правильность ввода';
      } else if (formData.species === 'cat' && weight > 20) {
        newErrors.weight = 'Вес кошки не может превышать 20 кг. Проверьте правильность ввода';
      } else if (formData.species === 'dog' && weight > 100) {
        newErrors.weight = 'Вес собаки не может превышать 100 кг. Проверьте правильность ввода';
      }
    }
    
    if (formData.isNeutered === null) {
      newErrors.neutered = 'Укажите, кастрирован/стерилизован ли питомец. Это важно для рекомендаций по питанию';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  // Расчёт даты рождения из возраста
  const calculateDateOfBirth = useCallback(() => {
    if (formData.ageType === 'exact') {
      return formData.dateOfBirth;
    }
    
    const years = parseInt(formData.ageYears) || 0;
    const months = parseInt(formData.ageMonths) || 0;
    
    if (years === 0 && months === 0) return null;
    
    const now = new Date();
    const dob = new Date(now);
    dob.setFullYear(dob.getFullYear() - years);
    dob.setMonth(dob.getMonth() - months);
    
    return dob;
  }, [formData.ageType, formData.dateOfBirth, formData.ageYears, formData.ageMonths]);
  
  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const dateOfBirth = calculateDateOfBirth();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4f373f70-f463-4309-8a8e-4162185b5f36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PetCreateForm.jsx:handleSubmit:dob',message:'Calculated date_of_birth for create',data:{ageType:formData.ageType,ageYears:formData.ageYears,ageMonths:formData.ageMonths,dateOfBirthISO:dateOfBirth ? dateOfBirth.toISOString() : null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const payload = {
        name: formData.name.trim(),
        species: formData.species,
        sex: formData.sex,
        breed_id: formData.breedId,
        date_of_birth: dateOfBirth?.toISOString().split('T')[0],
        weight_kg: parseFloat(formData.weightKg),
        is_neutered: formData.isNeutered,
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4f373f70-f463-4309-8a8e-4162185b5f36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PetCreateForm.jsx:handleSubmit:payload',message:'Create pet payload summary',data:{species:payload.species,sex:payload.sex,breed_id:payload.breed_id,weight_kg:payload.weight_kg,date_of_birth:payload.date_of_birth,is_neutered:payload.is_neutered,hasPhoto:!!payload.photo},timestamp:Date.now(),sessionId:'debug-session',runId:'pre',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Добавляем фото если есть
      if (formData.photo) {
        payload.photo = formData.photo;
      }
      
      const response = await createPet(payload);
      // API возвращает {message, data}, берём data
      const createdPet = response.data?.data || response.data;
      
      if (!createdPet?.id) {
        throw new Error('Не удалось получить ID созданного питомца');
      }
      
      // Переходим на Этап 2 (расширенный профиль) СРАЗУ
      navigate(`/pets/${createdPet.id}/edit`, { 
        state: { 
          isNewPet: true, 
          showAutofilledMessage: true 
        } 
      });
      
    } catch (error) {
      console.error('Ошибка создания питомца:', error);
      setErrors({ submit: error.response?.data?.message || 'Ошибка при создании питомца' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-create-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Хедер */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h2 id="pet-create-title" className="text-xl font-bold text-gray-800">Добавить питомца</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Фото */}
          <PhotoUpload
            photo={formData.photo}
            photoPreview={formData.photoPreview}
            species={formData.species}
            onChange={updateField}
          />
          
          {/* Имя */}
          <TextField
            label="Имя питомца"
            value={formData.name}
            onChange={(value) => updateField({ name: value })}
            placeholder="Как зовут вашего питомца?"
            error={errors.name}
            required
          />
          
          {/* Тип */}
          <ButtonSelect
            label="Кто ваш питомец?"
            options={SPECIES_OPTIONS}
            value={formData.species}
            onChange={(value) => updateField({ species: value, breed: '', breedId: null })}
            error={errors.species}
            required
          />
          
          {/* Пол */}
          <ButtonSelect
            label="Пол"
            options={SEX_OPTIONS}
            value={formData.sex}
            onChange={(value) => updateField({ sex: value })}
            error={errors.sex}
            required
          />
          
          {/* Порода */}
          <BreedSelect
            species={formData.species}
            value={formData.breed}
            breedId={formData.breedId}
            isMixed={formData.isMixed}
            breeds={breeds}
            popularBreeds={popularBreeds}
            onSearch={searchBreeds}
            onChange={updateField}
            error={errors.breed}
            required
          />
          
          {/* Возраст */}
          <AgeSelect
            ageType={formData.ageType}
            dateOfBirth={formData.dateOfBirth}
            ageYears={formData.ageYears}
            ageMonths={formData.ageMonths}
            onChange={updateField}
            error={errors.age}
            required
          />
          
          {/* Вес */}
          <WeightInput
            value={formData.weightKg}
            onChange={(value) => updateField({ weightKg: value })}
            error={errors.weight}
            required
            selectedBreed={breeds.find(b => b.id === formData.breedId)}
            ageMonths={formData.ageType === 'exact' 
              ? (formData.dateOfBirth ? Math.floor((new Date() - new Date(formData.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30)) : null)
              : ((parseInt(formData.ageYears) || 0) * 12 + (parseInt(formData.ageMonths) || 0))
            }
            species={formData.species}
          />
          
          {/* Кастрация */}
          <ButtonSelect
            label={formData.sex === 'female' ? 'Стерилизована?' : 'Кастрирован?'}
            options={NEUTERED_OPTIONS}
            value={formData.isNeutered}
            onChange={(value) => updateField({ isNeutered: value })}
            error={errors.neutered}
            required
          />
          
          {/* Ошибка отправки */}
          {errors.submit && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {errors.submit}
            </div>
          )}
          
          {/* Кнопка отправки */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-500 
                       text-white font-semibold rounded-xl shadow-lg
                       hover:from-purple-700 hover:to-purple-600 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Создаём профиль...
              </>
            ) : (
              <>
                🐾 Добавить питомца
              </>
            )}
          </button>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            * — обязательные поля
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PetCreateForm;
