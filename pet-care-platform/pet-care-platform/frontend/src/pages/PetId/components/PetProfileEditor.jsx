/**
 * PetProfileEditor - Компонент редактирования расширенного профиля питомца
 * 
 * Разделён на секции: Основное, Здоровье, Питание, Поведение, Образ жизни, Осмотр ветеринара
 * Все поля используют выпадающие списки для предотвращения некорректного ввода
 * С индивидуальными шкалами заполненности для каждого раздела
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, ChevronRight, Check, AlertTriangle, Search, Plus, Trash2, Calendar,
  Heart, Utensils, Brain, Home, User, Activity, Scale, Info, Stethoscope, ChevronDown
} from 'lucide-react';
import {
  ACTIVITY_LEVEL_OPTIONS, SIZE_OPTIONS, COAT_TYPE_OPTIONS,
  DIET_TYPE_OPTIONS, FEEDING_FREQUENCY_OPTIONS, HOUSING_TYPE_OPTIONS,
  SOCIAL_LEVEL_OPTIONS, TEMPERAMENT_OPTIONS, BEHAVIORAL_PROBLEMS_OPTIONS, getBreeds,
  getHealthConditions, getAllergies, getVaccines, getMedications, getMedicationCategories,
  getPetHealthConditions, addPetHealthCondition, deletePetHealthCondition,
  getPetAllergies, addPetAllergy, deletePetAllergy,
  getPetVaccinations, addPetVaccination, deletePetVaccination,
  getPetMedications, addPetMedication, deletePetMedication
} from '../../../api/pets';
import {
  WALK_FREQUENCY_OPTIONS, WALK_DURATION_OPTIONS
} from '../../../data/petHealthData';

// ===== СЕКЦИИ РЕДАКТИРОВАНИЯ =====
const SECTIONS = [
  { 
    id: 'basic', 
    label: 'Основное', 
    icon: User,
    fields: ['name', 'breed', 'date_of_birth', 'gender', 'coat_type', 'is_neutered']
  },
  { 
    id: 'health', 
    label: 'Здоровье', 
    icon: Heart,
    fields: [
      'health_conditions',
      'allergies',
      'sensitive_digestion',
      'vaccinations',
      'medications'
    ]
  },
  { 
    id: 'nutrition', 
    label: 'Питание', 
    icon: Utensils,
    fields: ['diet_type', 'feeding_frequency', 'current_food']
  },
  { 
    id: 'behavior', 
    label: 'Поведение', 
    icon: Brain,
    fields: ['temperament', 'social_level', 'behavioral_problems']
  },
  { 
    id: 'lifestyle', 
    label: 'Образ жизни', 
    icon: Home,
    fields: ['housing_type', 'has_yard', 'has_children', 'walk_frequency', 'walk_duration']
  },
  {
    id: 'vet_exam',
    label: 'Осмотр ветеринара',
    icon: Stethoscope,
    fields: ['last_vet_visit', 'weight', 'body_condition_score', 'heart_rate', 'respiratory_rate', 'temperature', 'vet_notes']
  }
];

// ===== ФУНКЦИИ ДЛЯ ЦВЕТА ШКАЛЫ =====
const getProgressColor = (percent) => {
  if (percent <= 25) return { from: '#fbba2d', to: '#fbba2d' };
  if (percent <= 50) return { from: '#fbba2d', to: '#fbba2d' };
  if (percent <= 75) return { from: '#fbba2d', to: '#84cc16' };
  return { from: '#84cc16', to: '#22c55e' };
};

// ===== КОМПОНЕНТ ШКАЛЫ ЗАПОЛНЕНИЯ =====
const SectionProgressBar = ({ percent, label }) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = getProgressColor(percent);
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }}
        />
      </div>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10"
          >
            {label}: {percent}%
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== КОМПОНЕНТ ВЫПАДАЮЩЕГО СПИСКА =====
const SelectField = ({ label, value, onChange, options, placeholder, required, disabled = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all appearance-none bg-white ${
        disabled
          ? 'border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed'
          : 'border-gray-200 focus:border-primary-500 focus:outline-none'
      }`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
    >
      <option value="">{placeholder || 'Выберите...'}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// ===== КОМПОНЕНТ ПОИСКА С ВЫПАДАЮЩИМ СПИСКОМ =====
const SearchableSelect = ({ label, value, onChange, options, placeholder, multiple = false, renderOption }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxRef = useRef(null);
  const searchInputRef = useRef(null);
  const listboxIdRef = useRef(`searchable-listbox-${Math.random().toString(36).slice(2)}`);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(opt => 
      opt.name?.toLowerCase().includes(searchLower) || 
      opt.label?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItems = multiple ? (value || []) : (value ? [value] : []);
  
  const toggleItem = (item) => {
    if (multiple) {
      const newValue = selectedItems.includes(item.id || item.value)
        ? selectedItems.filter(v => v !== (item.id || item.value))
        : [...selectedItems, item.id || item.value];
      onChange(newValue);
    } else {
      onChange(item.id || item.value);
      setIsOpen(false);
    }
  };

  const getDisplayName = (id) => {
    const opt = options.find(o => (o.id || o.value) === id);
    return opt?.name || opt?.label || id;
  };

  const prevFilteredOptionsLengthRef = useRef(filteredOptions.length);
  const prevSelectedIdRef = useRef(selectedItems[0]);
  const isInitialMountRef = useRef(true);
  
  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      prevFilteredOptionsLengthRef.current = filteredOptions.length;
      prevSelectedIdRef.current = selectedItems[0];
      isInitialMountRef.current = true;
      return;
    }
    if (filteredOptions.length === 0) {
      setActiveIndex(-1);
      prevFilteredOptionsLengthRef.current = 0;
      return;
    }
    
    const selectedId = selectedItems[0];
    const selectedIndex = filteredOptions.findIndex(
      (opt) => (opt.id || opt.value) === selectedId
    );
    
    // Only reset activeIndex if:
    // 1. Dropdown just opened (isInitialMountRef.current is true)
    // 2. Filtered options length changed (user typed in search, results changed)
    // 3. Selected item changed (user selected a different item)
    const filteredOptionsLengthChanged = prevFilteredOptionsLengthRef.current !== filteredOptions.length;
    const selectedItemChanged = prevSelectedIdRef.current !== selectedId;
    const shouldReset = isInitialMountRef.current || filteredOptionsLengthChanged || selectedItemChanged;
    
    setActiveIndex((prev) => {
      // If user is navigating (prev >= 0) and nothing significant changed, keep current position
      if (prev >= 0 && !shouldReset) {
        return prev; // Keep current navigation position
      }
      // Otherwise, set to selected item or 0
      return selectedIndex >= 0 ? selectedIndex : 0;
    });
    
    prevFilteredOptionsLengthRef.current = filteredOptions.length;
    prevSelectedIdRef.current = selectedId;
    isInitialMountRef.current = false;
  }, [isOpen, filteredOptions, selectedItems]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.querySelector(
        `#${listboxIdRef.current}-opt-${activeIndex}`
      );
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  const moveActiveIndex = (delta) => {
    if (filteredOptions.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return filteredOptions.length - 1;
      if (next >= filteredOptions.length) return 0;
      return next;
    });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) setIsOpen(true);
      moveActiveIndex(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) setIsOpen(true);
      moveActiveIndex(-1);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) setActiveIndex(filteredOptions.length - 1);
      return;
    }
    if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        toggleItem(filteredOptions[activeIndex]);
      }
      return;
    }
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const handleListKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) setIsOpen(true);
      moveActiveIndex(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) setIsOpen(true);
      moveActiveIndex(-1);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length > 0) setActiveIndex(filteredOptions.length - 1);
      return;
    }
    if (e.key === 'Enter' && isOpen && activeIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleItem(filteredOptions[activeIndex]);
      return;
    }
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDownCapture={(e) => {
        // If focus is on the search input, let it handle the event - don't intercept
        if (e.target === searchInputRef.current || e.target.tagName === 'INPUT') {
          return;
        }
        if (!isOpen) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            setIsOpen(true);
            setTimeout(() => {
              searchInputRef.current?.focus();
              if (e.key === 'ArrowDown') moveActiveIndex(1);
              if (e.key === 'ArrowUp') moveActiveIndex(-1);
            }, 0);
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
        const handledKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape'];
        if (handledKeys.includes(e.key)) {
          handleListKeyDown(e);
        }
      }}
    >
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      
      <div 
        className="w-full min-h-[46px] px-4 py-2 rounded-xl border-2 border-gray-200 focus-within:border-primary-500 focus:border-primary-500 bg-white cursor-pointer flex flex-wrap gap-1.5 items-center"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 0);
        }}
        onFocus={(e) => {
          setIsOpen(true);
          if (e.target === e.currentTarget) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            if (!isOpen) {
              setIsOpen(true);
            }
            moveActiveIndex(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            if (!isOpen) {
              setIsOpen(true);
            }
            moveActiveIndex(-1);
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            if (!isOpen) {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(true);
              return;
            }
            if (activeIndex >= 0) {
              e.preventDefault();
              e.stopPropagation();
              toggleItem(filteredOptions[activeIndex]);
              return;
            }
          }
          if (e.key === 'Escape') {
            if (isOpen) {
              e.preventDefault();
              e.stopPropagation();
            }
            setIsOpen(false);
          }
        }}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxIdRef.current}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
        }
        aria-label={label}
      >
        {selectedItems.length > 0 ? (
          selectedItems.map(id => (
            <span 
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-sm"
            >
              {getDisplayName(id)}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleItem({ id }); }}
                className="hover:text-primary-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className="w-5 h-5 text-gray-400 ml-auto" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 focus:outline-none text-sm"
                  autoFocus
                  role="combobox"
                  aria-expanded={isOpen}
                  aria-controls={listboxIdRef.current}
                  aria-activedescendant={
                    activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
                  }
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
            </div>
            <div
              ref={listboxRef}
              id={listboxIdRef.current}
              role="listbox"
              tabIndex={0}
              className="max-h-48 overflow-y-auto p-1"
              onMouseDown={(e) => {
                e.preventDefault();
                listboxRef.current?.focus();
              }}
              onKeyDown={handleListKeyDown}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, index) => {
                  const isSelected = selectedItems.includes(opt.id || opt.value);
                  return (
                    <button
                      key={opt.id || opt.value}
                      type="button"
                      id={`${listboxIdRef.current}-opt-${index}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      tabIndex={-1}
                      onClick={() => toggleItem(opt)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onKeyDown={handleListKeyDown}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeIndex === index
                          ? 'bg-primary-100 text-primary-700'
                          : isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'hover:bg-gray-100'
                      }`}
                    >
                      {renderOption ? renderOption(opt) : (opt.name || opt.label)}
                      {opt.category && (
                        <span className="text-xs text-gray-400 ml-2">({opt.category})</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-gray-400 text-sm">
                  Ничего не найдено
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== КОМПОНЕНТ AUTOCOMPLETE ДЛЯ ПОРОДЫ =====
const BreedAutocomplete = ({ species, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxIdRef = useRef(`breed-listbox-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (value?.name) {
      setSearch(value.name);
    } else if (!value) {
      setSearch('');
    }
  }, [value]);

  useEffect(() => {
    const fetchBreeds = async () => {
      if (!species || search.length < 1) return;
      setLoading(true);
      try {
        const response = await getBreeds({ species, search, limit: 20 });
        setBreeds(response.breeds || []);
      } catch (error) {
        console.error('Error fetching breeds:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeout = setTimeout(fetchBreeds, 300);
    return () => clearTimeout(timeout);
  }, [species, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
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
    if (breeds.length === 0) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = value?.id
      ? breeds.findIndex((breed) => breed.id === value.id)
      : -1;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, breeds, value]);

  // «Беспородный» вариант — это не порода из БД, а отдельный выбор (как в форме
  // создания питомца). Всегда доступен в конце списка, даже если поиск по «метис»
  // не вернул ни одной породы.
  const mixedBreed = species === 'cat'
    ? { id: 'mixed', name: 'Беспородная / Метис', isMixed: true }
    : { id: 'mixed', name: 'Дворняга / Метис', isMixed: true };
  const options = [...breeds, mixedBreed];

  const handleSelect = (breed) => {
    const isMixed = breed.isMixed || breed.id === 'mixed';
    setSearch(breed.name);
    // Для беспородного шлём id:null (нет FK), но сохраняем читаемое имя.
    onChange(isMixed ? { id: null, name: breed.name, isMixed: true } : { id: breed.id, name: breed.name });
    setIsOpen(false);
  };

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
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Порода</label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Начните вводить породу..."
          className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none transition-all"
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
              handleSelect(options[activeIndex]);
              return;
            }
            if (e.key === 'Escape' && isOpen) {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && options.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-48 overflow-y-auto"
            id={listboxIdRef.current}
            role="listbox"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }
            }}
          >
            {options.map((breed, index) => (
              <button
                key={breed.id}
                type="button"
                onClick={() => handleSelect(breed)}
                id={`${listboxIdRef.current}-opt-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && isOpen) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                  }
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  activeIndex === index ? 'bg-primary-100 text-primary-700' : 'hover:bg-primary-50'
                }`}
              >
                {breed.name}
                {breed.name_en && (
                  <span className="text-xs text-gray-400 ml-2">({breed.name_en})</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== КОМПОНЕНТ ВАКЦИНАЦИЙ =====
const VaccinationsField = ({ vaccinations = [], vaccineOptions = [], onAdd, onRemove }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newVaccine, setNewVaccine] = useState({
    vaccine_code: '',
    date_administered: '',
    next_due_date: '',
  });

  const calculateNextDueDate = (dateValue, vaccineCode) => {
    if (!dateValue || !vaccineCode) return '';
    const vaccine = vaccineOptions.find((item) => item.code === vaccineCode);
    if (!vaccine?.booster_interval_months) return '';
    const baseDate = new Date(dateValue);
    if (Number.isNaN(baseDate.getTime())) return '';
    const nextDate = new Date(baseDate);
    nextDate.setMonth(nextDate.getMonth() + Number(vaccine.booster_interval_months));
    return nextDate.toISOString().slice(0, 10);
  };

  const addVaccination = async () => {
    if (!newVaccine.vaccine_code || !newVaccine.date_administered) return;
    await onAdd(newVaccine);
    setNewVaccine({
      vaccine_code: '',
      date_administered: '',
      next_due_date: '',
    });
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Вакцинации</label>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-primary-50 rounded-xl space-y-2"
        >
          <SearchableSelect
            label="Вакцина"
            value={newVaccine.vaccine_code}
            onChange={(value) => {
              const vaccine_code = value || '';
              const next_due_date = calculateNextDueDate(newVaccine.date_administered, vaccine_code);
              setNewVaccine({ ...newVaccine, vaccine_code, next_due_date });
            }}
            options={vaccineOptions.map((item) => ({
              id: item.code,
              name: item.name_ru || item.name_en || item.code,
            }))}
            placeholder="Выберите вакцину..."
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Дата вакцинации</label>
              <input
                type="date"
                value={newVaccine.date_administered}
                onChange={(e) => {
                  const date_administered = e.target.value;
                  const next_due_date = calculateNextDueDate(date_administered, newVaccine.vaccine_code);
                  setNewVaccine({ ...newVaccine, date_administered, next_due_date });
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Следующая вакцинация</label>
              <input
                type="date"
                value={newVaccine.next_due_date}
                onChange={(e) => setNewVaccine({ ...newVaccine, next_due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addVaccination}
            disabled={!newVaccine.vaccine_code || !newVaccine.date_administered}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Добавить
          </button>
        </motion.div>
      )}

      {vaccinations.length > 0 ? (
        <div className="space-y-2">
          {vaccinations.map((vac) => (
            <div key={vac.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-medium text-sm">
                  {vac.vaccine_detail?.name_ru || vac.vaccine_detail?.name_en || 'Неизвестная вакцина'}
                </div>
                <div className="text-xs text-gray-500">
                  Дата: {new Date(vac.date_administered).toLocaleDateString('ru-RU')}
                  {vac.next_due_date && (
                    <span className="ml-2 text-accent-600">
                      Следующая: {new Date(vac.next_due_date).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(vac.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center py-4">
          Нет добавленных вакцинаций
        </div>
      )}
    </div>
  );
};

// ===== КОМПОНЕНТ ПРЕПАРАТОВ =====
const MedicationsField = ({
  medications = [],
  medicationOptions = [],
  medicationCategoryOptions = [],
  medicationCategory,
  onCategoryChange,
  onAdd,
  onRemove
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({
    medication_code: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    start_date: '',
    end_date: '',
  });

  const frequencyOptions = [
    { value: 'three_times_daily', label: '3 раза в день' },
    { value: 'twice_daily', label: '2 раза в день' },
    { value: 'once_daily', label: '1 раз в день' },
    { value: 'every_other_day', label: 'Через день' },
    { value: 'weekly', label: 'Раз в неделю' },
    { value: 'monthly', label: 'Раз в месяц' },
  ];

  const addMedication = async () => {
    if (!newMed.medication_code || !newMed.start_date || !newMed.frequency) return;
    await onAdd(newMed);
    setNewMed({
      medication_code: '',
      medication_name: '',
      dosage: '',
      frequency: '',
      start_date: '',
      end_date: '',
    });
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Принимаемые препараты</label>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-primary-50 rounded-xl space-y-2"
        >
          <SelectField
            label="Категория"
            value={medicationCategory}
            onChange={onCategoryChange}
            options={medicationCategoryOptions}
            placeholder="Все категории"
          />
          <SearchableSelect
            label="Препарат"
            value={newMed.medication_code}
            onChange={(value) => {
              const medication_code = value || '';
              const selected = medicationOptions.find((item) => item.code === medication_code);
              setNewMed({
                ...newMed,
                medication_code,
                medication_name: selected?.name_trade || selected?.name_active || '',
              });
            }}
            options={medicationOptions.map((item) => ({
              id: item.code,
              name: item.name_active
                ? `${item.name_trade} (${item.name_active})`
                : (item.name_trade || item.name_active || item.code),
            }))}
            placeholder="Выберите препарат..."
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              placeholder="Дозировка"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <select
              value={newMed.frequency}
              onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">Частота приёма</option>
              {frequencyOptions.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Начало приёма</label>
              <input
                type="date"
                value={newMed.start_date}
                onChange={(e) => setNewMed({ ...newMed, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Окончание приёма</label>
              <input
                type="date"
                value={newMed.end_date}
                onChange={(e) => setNewMed({ ...newMed, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={addMedication}
            disabled={!newMed.medication_code || !newMed.start_date || !newMed.frequency}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Добавить препарат
          </button>
        </motion.div>
      )}

      {medications.length > 0 ? (
        <div className="space-y-2">
          {medications.map((med) => (
            <div key={med.id} className="p-3 bg-gray-50 rounded-xl flex items-start justify-between">
              <div>
                <div className="font-medium text-sm">
                  {med.medication_detail?.name_trade || med.medication_name}
                </div>
                {med.dosage && <div className="text-xs text-gray-600">Дозировка: {med.dosage}</div>}
                <div className="text-xs text-gray-500">
                  Начало: {new Date(med.start_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(med.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center py-4">
          Нет принимаемых препаратов
        </div>
      )}
    </div>
  );
};

// ===== КОМПОНЕНТ ПЕРЕКЛЮЧАТЕЛЯ =====
const ToggleField = ({ label, checked, onChange, description }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
    <div>
      <span className="font-medium text-gray-700">{label}</span>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </div>
);

const calculateBcs = (weightValue, idealWeightValue) => {
  if (!weightValue || !idealWeightValue) return null;
  const ratio = weightValue / idealWeightValue;

  if (ratio < 0.85) return Math.max(1, Math.round(5 * ratio));
  if (ratio < 1.10) return 5;
  if (ratio < 1.20) return 6;
  if (ratio < 1.30) return 7;
  return ratio < 1.40 ? 8 : 9;
};

// ===== ОСНОВНОЙ КОМПОНЕНТ =====
export default function PetProfileEditor({ pet, onClose, onSave, isLoading }) {
  const modalRef = useRef(null);
  const exitConfirmRef = useRef(null);
  const previousActiveElement = useRef(null);
  const [formData, setFormData] = useState({});
  const [activeSection, setActiveSection] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [healthConditionOptions, setHealthConditionOptions] = useState([]);
  const [allergyOptions, setAllergyOptions] = useState([]);
  const [vaccineOptions, setVaccineOptions] = useState([]);
  const [medicationOptions, setMedicationOptions] = useState([]);
  const [medicationCategoryOptions, setMedicationCategoryOptions] = useState([]);
  const [medicationCategory, setMedicationCategory] = useState('');
  const [petHealthConditions, setPetHealthConditions] = useState([]);
  const [petAllergies, setPetAllergies] = useState([]);
  const [petVaccinations, setPetVaccinations] = useState([]);
  const [petMedications, setPetMedications] = useState([]);

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

  useEffect(() => {
    if (!showExitConfirm || !exitConfirmRef.current) return;
    const focusable = exitConfirmRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      exitConfirmRef.current.focus();
    }
  }, [showExitConfirm]);

  // Инициализация данных формы
  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed_id ? { id: pet.breed_id, name: pet.breed_name || '' } : null,
        date_of_birth: pet.date_of_birth || '',
        gender: pet.sex || '',
        is_neutered: pet.is_neutered || false,
        weight: pet.weight_kg || '',
        ideal_weight_kg: pet.ideal_weight_kg || null,
        size: pet.size_category || pet.calculated_size_category || '',
        coat_type: pet.coat_type || '',
        body_type: pet.body_type || '',
        activity_level: pet.activity_level || 'moderate',
        health_conditions: [],
        allergies: [],
        diet_type: pet.diet_type || '',
        feeding_frequency: pet.feeding_frequency || '',
        sensitive_digestion: pet.sensitive_digestion || false,
        current_food: pet.current_food || null,
        temperament: pet.temperament || '',
        social_level: pet.social_level || '',
        behavioral_problems: pet.behavioral_problems || [],
        housing_type: pet.housing_type || '',
        has_yard: pet.has_yard || false,
        has_other_pets: pet.has_other_pets || false,
        has_children: pet.has_children || false,
        walk_frequency: pet.walk_frequency || '',
        walk_duration: pet.walk_duration || '',
        // Поля осмотра ветеринара
        last_vet_visit: pet.last_vet_visit || '',
        body_condition_score: pet.body_condition_score ? String(pet.body_condition_score) : '',
        heart_rate: pet.heart_rate || '',
        respiratory_rate: pet.respiratory_rate || '',
        temperature: pet.temperature || '',
        vet_notes: pet.vet_notes || '',
      });
    }
  }, [pet]);

  const handleKeyDown = (event) => {
    if (event.defaultPrevented) return;
    if (showExitConfirm && exitConfirmRef.current) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowExitConfirm(false);
        return;
      }
      if (event.key === 'Tab') {
        const focusable = exitConfirmRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
          return;
        }
        if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
          return;
        }
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
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

  const requestClose = useCallback(() => {
    if (hasChanges) {
      setShowExitConfirm(true);
      return;
    }
    onClose();
  }, [hasChanges, onClose]);

  const confirmClose = useCallback(() => {
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!pet?.id) return;

    const fetchHealthData = async () => {
      try {
        const [
          conditionsResponse,
          allergiesResponse,
          vaccinesResponse,
          medicationCategoriesResponse,
          petConditions,
          petAllergiesResponse,
          vaccinationsResponse,
          petMedicationsResponse
        ] =
          await Promise.all([
            getHealthConditions({ species: pet.species }),
            getAllergies({ animal_type: pet.species }),
            getVaccines({ species: pet.species }),
            getMedicationCategories(),
            getPetHealthConditions(pet.id),
            getPetAllergies(pet.id),
            getPetVaccinations(pet.id),
            getPetMedications(pet.id),
          ]);

        const conditions = conditionsResponse.results || conditionsResponse.data || conditionsResponse || [];
        const allergies = allergiesResponse.results || allergiesResponse.data || allergiesResponse || [];

        setHealthConditionOptions(conditions);
        setAllergyOptions(allergies);
        setVaccineOptions(vaccinesResponse.results || vaccinesResponse.data || vaccinesResponse || []);
        setMedicationCategoryOptions(
          medicationCategoriesResponse.categories
            || medicationCategoriesResponse.data?.categories
            || medicationCategoriesResponse.data
            || []
        );

        const healthRecords = petConditions.results || petConditions.data || petConditions || [];
        const allergyRecords = petAllergiesResponse.results || petAllergiesResponse.data || petAllergiesResponse || [];

        setPetHealthConditions(healthRecords);
        setPetAllergies(allergyRecords);
        setPetVaccinations(vaccinationsResponse.results || vaccinationsResponse.data || vaccinationsResponse || []);
        setPetMedications(petMedicationsResponse.results || petMedicationsResponse.data || petMedicationsResponse || []);

        setFormData(prev => ({
          ...prev,
          health_conditions: healthRecords.map((record) => record.condition),
          allergies: allergyRecords.map((record) => record.allergy),
        }));
      } catch (error) {
        console.error('Ошибка загрузки данных здоровья:', error);
      }
    };

    fetchHealthData();
  }, [pet?.id, pet?.species]);

  useEffect(() => {
    if (!pet?.species) return;

    const fetchMedicationOptions = async () => {
      try {
        const response = await getMedications({
          species: pet.species,
          category: medicationCategory || undefined,
        });
        setMedicationOptions(response.results || response.data || response || []);
      } catch (error) {
        console.error('Ошибка загрузки справочника препаратов:', error);
      }
    };

    fetchMedicationOptions();
  }, [pet?.species, medicationCategory]);

  const handleChange = useCallback((field, value) => {
    if (field === 'weight') {
      setFormData(prev => {
        const nextState = { ...prev, weight: value };
        const weightValue = parseFloat(value);
        const idealWeightValue = parseFloat(prev.ideal_weight_kg);
        if (!Number.isNaN(weightValue) && !Number.isNaN(idealWeightValue)) {
          const bcs = calculateBcs(weightValue, idealWeightValue);
          if (bcs) {
            nextState.body_condition_score = String(bcs);
          }
        }
        return nextState;
      });
    } else if (field === 'walk_frequency') {
      setFormData(prev => ({
        ...prev,
        walk_frequency: value,
        walk_duration: value === 'none' ? null : prev.walk_duration,
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setHasChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Введите кличку питомца. Поле обязательно для заполнения';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Кличка должна содержать минимум 2 символа';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Кличка не должна превышать 50 символов';
    }
    if (formData.weight !== '' && formData.weight !== null && formData.weight !== undefined) {
      const weightValue = parseFloat(formData.weight);
      if (Number.isNaN(weightValue) || weightValue <= 0) {
        newErrors.weight = 'Введите корректное значение веса в килограммах (например: 5.5)';
      } else if (weightValue < 0.3) {
        newErrors.weight = 'Вес не может быть меньше 0.3 кг. Проверьте правильность ввода';
      } else if (formData.species === 'cat' && weightValue > 20) {
        newErrors.weight = 'Вес кошки не может превышать 20 кг. Проверьте правильность ввода';
      } else if (formData.species === 'dog' && weightValue > 100) {
        newErrors.weight = 'Вес собаки не может превышать 100 кг. Проверьте правильность ввода';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = (options = {}) => {
    const { isDraft = false } = options;
    const rawCurrentFood = formData.current_food || null;
    const currentFood = isDraft
      ? rawCurrentFood
      : rawCurrentFood?.source
        ? {
            ...rawCurrentFood,
            daily_amount_grams: rawCurrentFood.daily_amount_grams
              ? Number(rawCurrentFood.daily_amount_grams)
              : undefined,
          }
        : null;

    return {
      name: formData.name,
      species: formData.species,
      breed_id: formData.breed?.id || null,
      date_of_birth: formData.date_of_birth || null,
      sex: formData.gender && formData.gender !== 'unknown' ? formData.gender : null,
      weight_kg: formData.weight ? parseFloat(formData.weight) : null,
      is_neutered: formData.is_neutered,
      size_category: formData.size || null,
      coat_type: formData.coat_type || null,
      ideal_weight_kg: formData.ideal_weight_kg || null,
      activity_level: formData.activity_level || null,
      housing_type: formData.housing_type || null,
      has_yard: formData.has_yard || false,
      yard_size: formData.yard_size || null,
      has_children: formData.has_children || false,
      has_other_pets: formData.has_other_pets || false,
      diet_type: formData.diet_type || null,
      feeding_frequency: formData.feeding_frequency ? parseInt(formData.feeding_frequency, 10) : null,
      current_food: currentFood,
      sensitive_digestion: formData.sensitive_digestion || false,
      neutering_date: formData.neutering_date || null,
      reproductive_state: formData.reproductive_state || null,
      pregnancy_week: formData.pregnancy_week || null,
      litter_size: formData.litter_size || null,
      lactation_week: formData.lactation_week || null,
      temperament: formData.temperament || null,
      social_level: formData.social_level || null,
      behavioral_problems: formData.behavioral_problems || [],
      last_vet_visit: formData.last_vet_visit || null,
      body_condition_score: formData.body_condition_score
        ? parseInt(formData.body_condition_score, 10)
        : null,
      heart_rate: formData.heart_rate ? parseInt(formData.heart_rate, 10) : null,
      respiratory_rate: formData.respiratory_rate ? parseInt(formData.respiratory_rate, 10) : null,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      vet_notes: formData.vet_notes?.trim() || null,
      walk_frequency: formData.walk_frequency || null,
      walk_duration: formData.walk_duration || null,
      is_draft: isDraft,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const dataToSave = buildPayload({ isDraft: false });
    
    try {
      await onSave(dataToSave, { isDraft: false });

      // Синхронизация хронических заболеваний
      const desiredConditions = new Set(formData.health_conditions || []);
      const existingConditions = new Map(
        (petHealthConditions || []).map((record) => [record.condition, record])
      );

      for (const code of desiredConditions) {
        if (!existingConditions.has(code)) {
          await addPetHealthCondition(pet.id, { condition: code });
        }
      }

      for (const [code, record] of existingConditions.entries()) {
        if (!desiredConditions.has(code)) {
          await deletePetHealthCondition(pet.id, record.id);
        }
      }

      // Синхронизация аллергий
      const desiredAllergies = new Set(formData.allergies || []);
      const existingAllergies = new Map(
        (petAllergies || []).map((record) => [record.allergy, record])
      );

      for (const code of desiredAllergies) {
        if (!existingAllergies.has(code)) {
          await addPetAllergy(pet.id, { allergy: code });
        }
      }

      for (const [code, record] of existingAllergies.entries()) {
        if (!desiredAllergies.has(code)) {
          await deletePetAllergy(pet.id, record.id);
        }
      }

      // Обновляем локальные данные после синхронизации
      const updatedConditions = await getPetHealthConditions(pet.id);
      const updatedAllergies = await getPetAllergies(pet.id);
      setPetHealthConditions(updatedConditions.results || updatedConditions.data || updatedConditions || []);
      setPetAllergies(updatedAllergies.results || updatedAllergies.data || updatedAllergies || []);
    } catch (error) {
      console.error('Ошибка сохранения данных здоровья:', error);
    }
  };


  // Расчёт заполненности каждого раздела
  const sectionProgress = useMemo(() => {
    const progress = {};
    
    SECTIONS.forEach(section => {
      const fields = section.fields;
      let filled = 0;
      
      fields.forEach(field => {
        let value = formData[field];

        if (field === 'vaccinations') {
          value = petVaccinations;
        }
        if (field === 'medications') {
          value = petMedications;
        }

        if (Array.isArray(value)) {
          if (value.length > 0) filled++;
        } else if (typeof value === 'boolean') {
          filled++;
        } else if (value && value !== '') {
          filled++;
        }
      });
      
      progress[section.id] = Math.round((filled / fields.length) * 100);
    });
    
    return progress;
  }, [formData]);

  const totalProgress = useMemo(() => {
    const sectionValues = Object.values(sectionProgress);
    if (sectionValues.length === 0) return 0;
    return Math.round(sectionValues.reduce((a, b) => a + b, 0) / sectionValues.length);
  }, [sectionProgress]);

  // Получение данных по виду животного
  const behavioralProblemsOptions = BEHAVIORAL_PROBLEMS_OPTIONS.map((item) => ({
    id: item.value,
    name: item.label,
  }));

  const bodyConditionOptions = [
    { value: '1', label: '1 - Истощение' },
    { value: '2', label: '2 - Очень худой' },
    { value: '3', label: '3 - Худой' },
    { value: '4', label: '4 - Недостаток веса' },
    { value: '5', label: '5 - Идеальный вес' },
    { value: '6', label: '6 - Избыток веса' },
    { value: '7', label: '7 - Полнота' },
    { value: '8', label: '8 - Ожирение' },
    { value: '9', label: '9 - Тяжёлое ожирение' },
  ];

  // Рендер секций
  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="pet-name-input" className="block text-sm font-medium text-gray-700 mb-1.5">
                Кличка <span className="text-red-500">*</span>
              </label>
              <input
                id="pet-name-input"
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Как зовут питомца?"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'pet-name-error' : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border-2 ${errors.name ? 'border-red-500' : 'border-gray-200'} focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
              />
              {errors.name && <p id="pet-name-error" className="text-red-600 text-xs mt-1" role="alert">{errors.name}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <BreedAutocomplete
                species={pet?.species}
                value={formData.breed}
                onChange={(v) => handleChange('breed', v)}
              />
              <div>
                <label htmlFor="pet-date-of-birth-input" className="block text-sm font-medium text-gray-700 mb-1.5">Дата рождения</label>
                <input
                  id="pet-date-of-birth-input"
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Пол"
                value={formData.gender}
                onChange={(v) => handleChange('gender', v)}
                options={[
                  { value: 'male', label: 'Мальчик' },
                  { value: 'female', label: 'Девочка' },
                  { value: 'unknown', label: 'Не указан' }
                ]}
              />
              <SelectField
                label="Тип шерсти"
                value={formData.coat_type}
                onChange={(v) => handleChange('coat_type', v)}
                options={COAT_TYPE_OPTIONS}
                placeholder="Выберите тип шерсти"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Уровень активности"
                value={formData.activity_level}
                onChange={(v) => handleChange('activity_level', v)}
                options={ACTIVITY_LEVEL_OPTIONS}
              />
            </div>
            
            <ToggleField
              label="Кастрирован/стерилизован"
              checked={formData.is_neutered}
              onChange={(v) => handleChange('is_neutered', v)}
            />
            
          </div>
        );

      case 'health':
        return (
          <div className="space-y-4">
            <SearchableSelect
              label="Хронические заболевания"
              value={formData.health_conditions}
              onChange={(v) => handleChange('health_conditions', v)}
              options={healthConditionOptions.map(item => ({
                id: item.code,
                name: item.name_ru || item.name_en || item.code,
                category: item.category,
              }))}
              placeholder="Выберите заболевания..."
              multiple
            />
            
            <SearchableSelect
              label="Аллергии и непереносимости"
              value={formData.allergies}
              onChange={(v) => handleChange('allergies', v)}
              options={allergyOptions.map(item => ({
                id: item.code,
                name: item.display_name || item.code,
                category: item.allergen_type,
              }))}
              placeholder="Выберите аллергии..."
              multiple
            />
            
            <ToggleField
              label="Чувствительное пищеварение"
              checked={formData.sensitive_digestion}
              onChange={(v) => handleChange('sensitive_digestion', v)}
              description="Склонность к расстройствам ЖКТ"
            />

            <VaccinationsField
              vaccinations={petVaccinations}
              vaccineOptions={vaccineOptions}
              onAdd={async (payload) => {
                const response = await addPetVaccination(pet.id, payload);
                const created = response.data || response;
                setPetVaccinations(prev => [created, ...prev]);
                setHasChanges(true);
              }}
              onRemove={async (recordId) => {
                await deletePetVaccination(pet.id, recordId);
                setPetVaccinations(prev => prev.filter(item => item.id !== recordId));
                setHasChanges(true);
              }}
            />

            <MedicationsField
              medications={petMedications}
              medicationOptions={medicationOptions}
              medicationCategoryOptions={medicationCategoryOptions}
              medicationCategory={medicationCategory}
              onCategoryChange={(value) => setMedicationCategory(value || '')}
              onAdd={async (payload) => {
                const response = await addPetMedication(pet.id, payload);
                const created = response.data || response;
                setPetMedications(prev => [created, ...prev]);
                setHasChanges(true);
              }}
              onRemove={async (recordId) => {
                await deletePetMedication(pet.id, recordId);
                setPetMedications(prev => prev.filter(item => item.id !== recordId));
                setHasChanges(true);
              }}
            />
          </div>
        );

      case 'nutrition':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Тип питания"
                value={formData.diet_type}
                onChange={(v) => handleChange('diet_type', v)}
                options={DIET_TYPE_OPTIONS}
              />
              <SelectField
                label="Частота кормления"
                value={formData.feeding_frequency}
                onChange={(v) => handleChange('feeding_frequency', v)}
                options={FEEDING_FREQUENCY_OPTIONS}
              />
            </div>
            
            <div className="space-y-2">
              <SelectField
                label="Текущий корм (источник)"
                value={formData.current_food?.source || ''}
                onChange={(v) => handleChange('current_food', { ...(formData.current_food || {}), source: v })}
                options={[
                  { value: 'catalog', label: 'Из каталога' },
                  { value: 'other', label: 'Другой корм' }
                ]}
              />

              {formData.current_food?.source === 'catalog' && (
                <>
                  <label htmlFor="current-food-id-input" className="block text-sm font-medium text-gray-700 mb-1.5">ID корма из каталога</label>
                  <input
                    id="current-food-id-input"
                    type="text"
                    value={formData.current_food?.food_id || ''}
                    onChange={(e) => handleChange('current_food', { ...(formData.current_food || {}), food_id: e.target.value })}
                    placeholder="ID корма из каталога"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </>
              )}

              {formData.current_food?.source === 'other' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="current-food-brand-input" className="block text-sm font-medium text-gray-700 mb-1.5">Бренд</label>
                    <input
                      id="current-food-brand-input"
                      type="text"
                      value={formData.current_food?.brand_name || ''}
                      onChange={(e) => handleChange('current_food', { ...(formData.current_food || {}), brand_name: e.target.value })}
                      placeholder="Бренд"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="current-food-product-input" className="block text-sm font-medium text-gray-700 mb-1.5">Название продукта</label>
                    <input
                      id="current-food-product-input"
                      type="text"
                      value={formData.current_food?.product_name || ''}
                      onChange={(e) => handleChange('current_food', { ...(formData.current_food || {}), product_name: e.target.value })}
                      placeholder="Название продукта"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="current-food-amount-input" className="block text-sm font-medium text-gray-700 mb-1.5">Суточная порция (граммы)</label>
                <input
                  id="current-food-amount-input"
                  type="number"
                  min="1"
                  value={formData.current_food?.daily_amount_grams || ''}
                  onChange={(e) => handleChange('current_food', { ...(formData.current_food || {}), daily_amount_grams: e.target.value })}
                  placeholder="Суточная порция (граммы)"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Темперамент"
                value={formData.temperament}
                onChange={(v) => handleChange('temperament', v)}
                options={TEMPERAMENT_OPTIONS}
              />
              <SelectField
                label="Уровень социализации"
                value={formData.social_level}
                onChange={(v) => handleChange('social_level', v)}
                options={SOCIAL_LEVEL_OPTIONS}
              />
            </div>

            <SearchableSelect
              label="Поведенческие проблемы"
              value={formData.behavioral_problems}
              onChange={(v) => handleChange('behavioral_problems', v)}
              options={behavioralProblemsOptions}
              placeholder="Выберите проблемы..."
              multiple
            />
          </div>
        );

      case 'lifestyle':
        return (
          <div className="space-y-4">
            <SelectField
              label="Тип жилья"
              value={formData.housing_type}
              onChange={(v) => handleChange('housing_type', v)}
              options={HOUSING_TYPE_OPTIONS}
            />
            
            <ToggleField
              label="Есть двор/участок"
              checked={formData.has_yard}
              onChange={(v) => handleChange('has_yard', v)}
            />

            <ToggleField
              label="Есть другие питомцы"
              checked={formData.has_other_pets}
              onChange={(v) => handleChange('has_other_pets', v)}
            />
            
            <ToggleField
              label="В доме есть дети"
              checked={formData.has_children}
              onChange={(v) => handleChange('has_children', v)}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Частота прогулок"
                value={formData.walk_frequency}
                onChange={(v) => handleChange('walk_frequency', v)}
                options={WALK_FREQUENCY_OPTIONS}
              />
              <SelectField
                label="Длительность прогулки"
                value={formData.walk_duration}
                onChange={(v) => handleChange('walk_duration', v)}
                options={WALK_DURATION_OPTIONS}
                disabled={formData.walk_frequency === 'none'}
              />
            </div>
          </div>
        );

      case 'vet_exam':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl mb-4">
              <div className="flex items-start gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Данные ветеринарного осмотра</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Эти поля заполняются на основе данных профессионального осмотра ветеринаром
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="last-vet-visit-input" className="block text-sm font-medium text-gray-700 mb-1.5">
                Дата последнего осмотра
              </label>
              <input
                id="last-vet-visit-input"
                type="date"
                value={formData.last_vet_visit || ''}
                onChange={(e) => handleChange('last_vet_visit', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="vet-weight-input" className="block text-sm font-medium text-gray-700 mb-1.5">Вес (кг)</label>
                <input
                  id="vet-weight-input"
                  type="number"
                  step="0.1"
                  min="0.3"
                  max={formData.species === 'cat' ? 20 : 100}
                  value={formData.weight || ''}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="Вес при осмотре"
                  aria-invalid={errors.weight ? 'true' : 'false'}
                  aria-describedby={errors.weight ? 'vet-weight-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border-2 ${errors.weight ? 'border-red-500' : 'border-gray-200'} focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all`}
                />
                {errors.weight && <p id="vet-weight-error" className="mt-2 text-sm text-red-600" role="alert">{errors.weight}</p>}
              </div>
              <SelectField
                label="Оценка упитанности (BCS)"
                value={formData.body_condition_score}
                onChange={(v) => handleChange('body_condition_score', v)}
                options={bodyConditionOptions}
                placeholder="Шкала 1-9"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="heart-rate-input" className="block text-sm font-medium text-gray-700 mb-1.5">ЧСС (уд/мин)</label>
                <input
                  id="heart-rate-input"
                  type="number"
                  value={formData.heart_rate || ''}
                  onChange={(e) => handleChange('heart_rate', e.target.value)}
                  placeholder="60-180"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="respiratory-rate-input" className="block text-sm font-medium text-gray-700 mb-1.5">ЧДД (дых/мин)</label>
                <input
                  id="respiratory-rate-input"
                  type="number"
                  value={formData.respiratory_rate || ''}
                  onChange={(e) => handleChange('respiratory_rate', e.target.value)}
                  placeholder="15-30"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="temperature-input" className="block text-sm font-medium text-gray-700 mb-1.5">Температура (°C)</label>
                <input
                  id="temperature-input"
                  type="number"
                  step="0.1"
                  value={formData.temperature || ''}
                  onChange={(e) => handleChange('temperature', e.target.value)}
                  placeholder="37.5-39.0"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="vet-notes-input" className="block text-sm font-medium text-gray-700 mb-1.5">Заметки ветеринара</label>
              <textarea
                id="vet-notes-input"
                value={formData.vet_notes || ''}
                onChange={(e) => handleChange('vet_notes', e.target.value)}
                placeholder="Дополнительные наблюдения и рекомендации врача..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-profile-editor-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex-1">
            <h2 id="pet-profile-editor-title" className="text-2xl font-bold text-gray-800">
              Редактирование: {pet?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Расширенный профиль для персонализированных рекомендаций
            </p>
          </div>
          <button onClick={requestClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Закрыть">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Sidebar: вертикальный на десктопе, горизонтальная лента вкладок на мобиле */}
          <div className="flex w-full flex-shrink-0 gap-2 overflow-x-auto border-b border-gray-100 p-3 lg:block lg:w-64 lg:gap-0 lg:space-y-2 lg:overflow-x-visible lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const progress = sectionProgress[section.id] || 0;
              
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex-shrink-0 text-left rounded-xl transition-all lg:w-full ${isActive ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-center gap-2 px-3 py-2.5 lg:gap-3 lg:px-4 lg:py-3 ${isActive ? 'text-primary-600' : 'text-gray-600'}`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm whitespace-nowrap lg:flex-1">{section.label}</span>
                    {isActive && <ChevronRight className="hidden w-4 h-4 lg:block" />}
                  </div>
                  <div className="hidden px-4 pb-3 lg:block">
                    <SectionProgressBar percent={progress} label={section.label} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="mb-4 px-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Полнота профиля</span>
                  </div>
                  <span className={`text-sm font-bold ${
                    totalProgress >= 75 ? 'text-green-600' :
                    totalProgress >= 50 ? 'text-yellow-600' :
                    'text-accent-600'
                  }`}>
                    {totalProgress}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${getProgressColor(totalProgress).from}, ${getProgressColor(totalProgress).to})`
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {hasChanges && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-accent-600" />
                      <span>Есть несохранённые изменения</span>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-100 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !hasChanges}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            >
              <motion.div
                ref={exitConfirmRef}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                tabIndex={-1}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="pet-profile-exit-title"
                aria-describedby="pet-profile-exit-description"
              >
                <h3 id="pet-profile-exit-title" className="text-lg font-semibold text-gray-800">
                  Выйти без сохранения?
                </h3>
                <p id="pet-profile-exit-description" className="mt-2 text-sm text-gray-600">
                  Вы действительно хотите выйти без сохранения?
                </p>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(false)}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-100 transition-all"
                  >
                    Остаться
                  </button>
                  <button
                    type="button"
                    onClick={confirmClose}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium hover:shadow-lg transition-all"
                  >
                    Да, выйти
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
