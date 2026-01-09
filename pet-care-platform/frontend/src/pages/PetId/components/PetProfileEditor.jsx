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
  ACTIVITY_LEVEL_OPTIONS, SIZE_OPTIONS,
  DIET_TYPE_OPTIONS, FEEDING_FREQUENCY_OPTIONS, HOUSING_TYPE_OPTIONS,
  DENTAL_HEALTH_OPTIONS, BEHAVIOR_TYPE_OPTIONS, SOCIAL_LEVEL_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS, getBreeds
} from '../../../api/pets';
import {
  getChronicConditions, getVaccinations, getMedications, getBehavioralProblems,
  PET_FOOD_PRODUCTS, ALLERGIES_LIST, CHARACTER_TRAITS_EXTENDED,
  WALK_FREQUENCY_OPTIONS, WALK_DURATION_OPTIONS, TRAINING_GOALS, OTHER_PET_TYPES,
  calculateNextVaccinationDate, getExcludedFoodsByMedications
} from '../../../data/petHealthData';

// ===== СЕКЦИИ РЕДАКТИРОВАНИЯ =====
const SECTIONS = [
  { 
    id: 'basic', 
    label: 'Основное', 
    icon: User,
    fields: ['name', 'breed', 'date_of_birth', 'gender', 'is_neutered', 'owner_phone', 'owner_email', 'owner_city']
  },
  { 
    id: 'health', 
    label: 'Здоровье', 
    icon: Heart,
    fields: ['health_issues', 'chronic_conditions', 'allergies', 'sensitive_digestion']
  },
  { 
    id: 'medical', 
    label: 'Медицина', 
    icon: Activity,
    fields: ['vaccinations', 'medications']
  },
  { 
    id: 'nutrition', 
    label: 'Питание', 
    icon: Utensils,
    fields: ['diet_type', 'feeding_frequency', 'favorite_foods', 'excluded_ingredients', 'vitamins_supplements']
  },
  { 
    id: 'behavior', 
    label: 'Поведение', 
    icon: Brain,
    fields: ['behavior_type', 'social_level', 'training_experience', 'character_traits', 'behavioral_problems', 'training_goals']
  },
  { 
    id: 'lifestyle', 
    label: 'Образ жизни', 
    icon: Home,
    fields: ['housing_type', 'has_yard', 'other_pets', 'has_children', 'walk_frequency', 'walk_duration']
  },
  {
    id: 'vet_exam',
    label: 'Осмотр ветеринара',
    icon: Stethoscope,
    fields: ['last_vet_visit', 'dental_health', 'body_type', 'weight', 'body_condition_score', 'heart_rate', 'respiratory_rate', 'temperature', 'vet_notes']
  }
];

// ===== ФУНКЦИИ ДЛЯ ЦВЕТА ШКАЛЫ =====
const getProgressColor = (percent) => {
  if (percent <= 25) return { from: '#f97316', to: '#fb923c' };
  if (percent <= 50) return { from: '#fb923c', to: '#facc15' };
  if (percent <= 75) return { from: '#facc15', to: '#84cc16' };
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
const SelectField = ({ label, value, onChange, options, placeholder, required }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all appearance-none bg-white"
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
  const containerRef = useRef(null);

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

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      
      <div 
        className="w-full min-h-[46px] px-4 py-2 rounded-xl border-2 border-gray-200 focus-within:border-purple-500 bg-white cursor-pointer flex flex-wrap gap-1.5 items-center"
        onClick={() => setIsOpen(true)}
      >
        {selectedItems.length > 0 ? (
          selectedItems.map(id => (
            <span 
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-sm"
            >
              {getDisplayName(id)}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleItem({ id }); }}
                className="hover:text-purple-900"
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
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => {
                  const isSelected = selectedItems.includes(opt.id || opt.value);
                  return (
                    <button
                      key={opt.id || opt.value}
                      type="button"
                      onClick={() => toggleItem(opt)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
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
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) setSearch(value);
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

  const handleSelect = (breed) => {
    setSearch(breed.name);
    onChange(breed.name);
    setIsOpen(false);
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
          className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {isOpen && breeds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-48 overflow-y-auto"
          >
            {breeds.map(breed => (
              <button
                key={breed.id}
                type="button"
                onClick={() => handleSelect(breed)}
                className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm transition-colors"
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
const VaccinationsField = ({ species, value = [], onChange }) => {
  const availableVaccinations = useMemo(() => getVaccinations(species), [species]);
  const [showAdd, setShowAdd] = useState(false);
  const [newVaccine, setNewVaccine] = useState({ vaccine_id: '', date: '' });

  const addVaccination = () => {
    if (!newVaccine.vaccine_id || !newVaccine.date) return;
    const vaccine = availableVaccinations.find(v => v.id === newVaccine.vaccine_id);
    const nextDate = calculateNextVaccinationDate(vaccine, newVaccine.date);
    
    onChange([...value, {
      ...newVaccine,
      name: vaccine.name,
      next_date: nextDate?.toISOString().split('T')[0]
    }]);
    setNewVaccine({ vaccine_id: '', date: '' });
    setShowAdd(false);
  };

  const removeVaccination = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Вакцинации</label>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-purple-50 rounded-xl space-y-2"
        >
          <select
            value={newVaccine.vaccine_id}
            onChange={(e) => setNewVaccine({ ...newVaccine, vaccine_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">Выберите вакцину</option>
            {availableVaccinations.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} {v.mandatory && '(обязательная)'}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={newVaccine.date}
              onChange={(e) => setNewVaccine({ ...newVaccine, date: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <button
              type="button"
              onClick={addVaccination}
              disabled={!newVaccine.vaccine_id || !newVaccine.date}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              Добавить
            </button>
          </div>
        </motion.div>
      )}

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((vac, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="font-medium text-sm">{vac.name}</div>
                <div className="text-xs text-gray-500">
                  Дата: {new Date(vac.date).toLocaleDateString('ru-RU')}
                  {vac.next_date && (
                    <span className="ml-2 text-orange-600">
                      Следующая: {new Date(vac.next_date).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeVaccination(index)}
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
const MedicationsField = ({ species, value = [], onChange, onExcludedFoodsUpdate }) => {
  const availableMedications = useMemo(() => getMedications(species), [species]);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ medication_id: '', dosage: '', frequency: '' });

  const frequencyOptions = [
    { value: '1x_day', label: '1 раз в день' },
    { value: '2x_day', label: '2 раза в день' },
    { value: '3x_day', label: '3 раза в день' },
    { value: 'as_needed', label: 'По необходимости' },
    { value: 'weekly', label: 'Раз в неделю' },
    { value: 'monthly', label: 'Раз в месяц' },
  ];

  const addMedication = () => {
    if (!newMed.medication_id) return;
    const med = availableMedications.find(m => m.id === newMed.medication_id);
    
    const updatedValue = [...value, {
      ...newMed,
      name: med.name,
      brandNames: med.brandNames,
      foodInteractions: med.foodInteractions
    }];
    
    onChange(updatedValue);
    
    // Обновляем исключённые продукты
    const excludedFoods = getExcludedFoodsByMedications(updatedValue.map(m => m.medication_id));
    onExcludedFoodsUpdate?.(excludedFoods);
    
    setNewMed({ medication_id: '', dosage: '', frequency: '' });
    setShowAdd(false);
  };

  const removeMedication = (index) => {
    const updatedValue = value.filter((_, i) => i !== index);
    onChange(updatedValue);
    
    const excludedFoods = getExcludedFoodsByMedications(updatedValue.map(m => m.medication_id));
    onExcludedFoodsUpdate?.(excludedFoods);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Принимаемые препараты</label>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-purple-50 rounded-xl space-y-2"
        >
          <select
            value={newMed.medication_id}
            onChange={(e) => setNewMed({ ...newMed, medication_id: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">Выберите препарат</option>
            {availableMedications.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.brandNames.slice(0, 2).join(', ')})
              </option>
            ))}
          </select>
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
              {frequencyOptions.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addMedication}
            disabled={!newMed.medication_id}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Добавить препарат
          </button>
        </motion.div>
      )}

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((med, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm">{med.name}</div>
                  {med.brandNames && (
                    <div className="text-xs text-gray-500">{med.brandNames.join(', ')}</div>
                  )}
                  {med.dosage && <div className="text-xs text-gray-600 mt-1">Дозировка: {med.dosage}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeMedication(index)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {med.foodInteractions?.note && (
                <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700">
                  ⚠️ {med.foodInteractions.note}
                </div>
              )}
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

// ===== КОМПОНЕНТ ДРУГИХ ПИТОМЦЕВ =====
const OtherPetsField = ({ value = [], onChange }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newPet, setNewPet] = useState({ type: '', breed: '', name: '' });

  const addPet = () => {
    if (!newPet.type) return;
    const petType = OTHER_PET_TYPES.find(p => p.id === newPet.type);
    onChange([...value, { ...newPet, typeName: petType?.name }]);
    setNewPet({ type: '', breed: '', name: '' });
    setShowAdd(false);
  };

  const removePet = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Другие питомцы дома</label>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-purple-50 rounded-xl space-y-2"
        >
          <select
            value={newPet.type}
            onChange={(e) => setNewPet({ ...newPet, type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">Тип животного</option>
            {OTHER_PET_TYPES.map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newPet.name}
            onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
            placeholder="Кличка (необязательно)"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
          <button
            type="button"
            onClick={addPet}
            disabled={!newPet.type}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Добавить
          </button>
        </motion.div>
      )}

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((pet, index) => {
            const petType = OTHER_PET_TYPES.find(p => p.id === pet.type);
            return (
              <div key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                <span>{petType?.icon}</span>
                <span className="text-sm">{pet.name || petType?.name}</span>
                <button
                  type="button"
                  onClick={() => removePet(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center py-2">
          Нет других питомцев
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
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </div>
);

// ===== ОСНОВНОЙ КОМПОНЕНТ =====
export default function PetProfileEditor({ pet, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState({});
  const [activeSection, setActiveSection] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});
  const [medicationExcludedFoods, setMedicationExcludedFoods] = useState([]);

  // Инициализация данных формы
  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        date_of_birth: pet.date_of_birth || '',
        gender: pet.gender || 'unknown',
        is_neutered: pet.is_neutered || false,
        weight: pet.weight || '',
        size: pet.size || pet.calculated_size || '',
        body_type: pet.body_type || '',
        activity_level: pet.activity_level || 'medium',
        health_issues: pet.health_issues || [],
        chronic_conditions: pet.chronic_conditions || [],
        vaccinations: pet.vaccinations || [],
        medications: pet.medications || [],
        allergies: pet.allergies || [],
        dental_health: pet.dental_health || '',
        diet_type: pet.diet_type || '',
        feeding_frequency: pet.feeding_frequency || '',
        favorite_foods: pet.favorite_foods || [],
        sensitive_digestion: pet.sensitive_digestion || false,
        excluded_ingredients: pet.excluded_ingredients || [],
        vitamins_supplements: pet.vitamins_supplements || [],
        behavior_type: pet.behavior_type || '',
        social_level: pet.social_level || '',
        training_experience: pet.training_experience || '',
        character_traits: pet.character_traits || [],
        behavioral_problems: pet.behavioral_problems || [],
        training_goals: pet.training_goals || [],
        housing_type: pet.housing_type || '',
        has_yard: pet.has_yard || false,
        other_pets: pet.other_pets || [],
        has_children: pet.has_children || false,
        walk_frequency: pet.walk_frequency || '',
        walk_duration: pet.walk_duration || '',
        owner_phone: pet.owner_phone || '',
        owner_email: pet.owner_email || '',
        owner_city: pet.owner_city || '',
        // Поля осмотра ветеринара
        last_vet_visit: pet.last_vet_visit || '',
        body_condition_score: pet.body_condition_score || '',
        heart_rate: pet.heart_rate || '',
        respiratory_rate: pet.respiratory_rate || '',
        temperature: pet.temperature || '',
        vet_notes: pet.vet_notes || '',
      });
    }
  }, [pet]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Обязательное поле';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    // Подготовка данных для отправки
    const dataToSave = {
      ...formData,
      // Преобразуем массивы для бэкенда
      chronic_conditions: formData.chronic_conditions || [],
      vaccinations: formData.vaccinations || [],
      medications: formData.medications || [],
      allergies: formData.allergies || [],
      favorite_foods: formData.favorite_foods || [],
      excluded_ingredients: [...(formData.excluded_ingredients || []), ...medicationExcludedFoods],
      character_traits: formData.character_traits || [],
      behavioral_problems: formData.behavioral_problems || [],
      training_goals: formData.training_goals || [],
      other_pets: formData.other_pets || [],
    };
    
    onSave(dataToSave);
  };

  // Расчёт заполненности каждого раздела
  const sectionProgress = useMemo(() => {
    const progress = {};
    
    SECTIONS.forEach(section => {
      const fields = section.fields;
      let filled = 0;
      
      fields.forEach(field => {
        const value = formData[field];
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
  const chronicConditionsOptions = useMemo(() => 
    getChronicConditions(pet?.species || 'dog').map(c => ({ id: c.id, name: c.name, category: c.category })),
    [pet?.species]
  );

  const behavioralProblemsOptions = useMemo(() => 
    getBehavioralProblems(pet?.species || 'dog').map(p => ({ id: p.id, name: p.name })),
    [pet?.species]
  );

  const foodProductsOptions = useMemo(() => 
    PET_FOOD_PRODUCTS.map(p => ({ id: p.id, name: p.name, category: p.category })),
    []
  );

  const trainingGoalsOptions = useMemo(() => 
    TRAINING_GOALS.map(g => ({ id: g.id, name: g.name })),
    []
  );

  const characterTraitsOptions = useMemo(() => 
    CHARACTER_TRAITS_EXTENDED.map(t => ({ id: t.id, name: t.name })),
    []
  );

  const allergiesOptions = useMemo(() => 
    ALLERGIES_LIST.map(a => ({ id: a.id, name: a.name, category: a.category })),
    []
  );

  const supplementsOptions = [
    { id: 'omega3', name: 'Омега-3 жирные кислоты' },
    { id: 'glucosamine', name: 'Глюкозамин' },
    { id: 'chondroitin', name: 'Хондроитин' },
    { id: 'probiotics', name: 'Пробиотики' },
    { id: 'multivitamins', name: 'Мультивитамины' },
    { id: 'biotin', name: 'Биотин' },
    { id: 'taurine', name: 'Таурин' },
    { id: 'lysine', name: 'Лизин' },
    { id: 'calcium', name: 'Кальций' },
    { id: 'iron', name: 'Железо' },
  ];

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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Кличка <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Как зовут питомца?"
                className={`w-full px-4 py-2.5 rounded-xl border-2 ${errors.name ? 'border-red-500' : 'border-gray-200'} focus:border-purple-500 focus:outline-none transition-all`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <BreedAutocomplete
                species={pet?.species}
                value={formData.breed}
                onChange={(v) => handleChange('breed', v)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Дата рождения</label>
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
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
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
                <input
                  type="tel"
                  value={formData.owner_phone || ''}
                  onChange={(e) => handleChange('owner_phone', e.target.value)}
                  placeholder="+7..."
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.owner_email || ''}
                  onChange={(e) => handleChange('owner_email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Город</label>
                <input
                  type="text"
                  value={formData.owner_city || ''}
                  onChange={(e) => handleChange('owner_city', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        );

      case 'health':
        return (
          <div className="space-y-4">
            <SearchableSelect
              label="Хронические заболевания"
              value={formData.chronic_conditions}
              onChange={(v) => handleChange('chronic_conditions', v)}
              options={chronicConditionsOptions}
              placeholder="Выберите заболевания..."
              multiple
            />
            
            <SearchableSelect
              label="Аллергии и непереносимости"
              value={formData.allergies}
              onChange={(v) => handleChange('allergies', v)}
              options={allergiesOptions}
              placeholder="Выберите аллергии..."
              multiple
            />
            
            <ToggleField
              label="Чувствительное пищеварение"
              checked={formData.sensitive_digestion}
              onChange={(v) => handleChange('sensitive_digestion', v)}
              description="Склонность к расстройствам ЖКТ"
            />

            {medicationExcludedFoods.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Ограничения из-за препаратов</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      На основе принимаемых препаратов рекомендуется исключить: {medicationExcludedFoods.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'medical':
        return (
          <div className="space-y-6">
            <VaccinationsField
              species={pet?.species}
              value={formData.vaccinations}
              onChange={(v) => handleChange('vaccinations', v)}
            />
            
            <MedicationsField
              species={pet?.species}
              value={formData.medications}
              onChange={(v) => handleChange('medications', v)}
              onExcludedFoodsUpdate={setMedicationExcludedFoods}
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
            
            <SearchableSelect
              label="Любимые продукты"
              value={formData.favorite_foods}
              onChange={(v) => handleChange('favorite_foods', v)}
              options={foodProductsOptions}
              placeholder="Выберите продукты..."
              multiple
            />
            
            <SearchableSelect
              label="Исключённые ингредиенты"
              value={formData.excluded_ingredients}
              onChange={(v) => handleChange('excluded_ingredients', v)}
              options={foodProductsOptions}
              placeholder="Продукты для исключения..."
              multiple
            />
            
            <SearchableSelect
              label="Витамины и добавки"
              value={formData.vitamins_supplements}
              onChange={(v) => handleChange('vitamins_supplements', v)}
              options={supplementsOptions}
              placeholder="Выберите добавки..."
              multiple
            />
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Тип поведения"
                value={formData.behavior_type}
                onChange={(v) => handleChange('behavior_type', v)}
                options={BEHAVIOR_TYPE_OPTIONS}
              />
              <SelectField
                label="Уровень социализации"
                value={formData.social_level}
                onChange={(v) => handleChange('social_level', v)}
                options={SOCIAL_LEVEL_OPTIONS}
              />
            </div>
            
            <SelectField
              label="Опыт дрессировки"
              value={formData.training_experience}
              onChange={(v) => handleChange('training_experience', v)}
              options={TRAINING_EXPERIENCE_OPTIONS}
            />
            
            <SearchableSelect
              label="Черты характера"
              value={formData.character_traits}
              onChange={(v) => handleChange('character_traits', v)}
              options={characterTraitsOptions}
              placeholder="Выберите черты характера..."
              multiple
            />
            
            <SearchableSelect
              label="Поведенческие проблемы"
              value={formData.behavioral_problems}
              onChange={(v) => handleChange('behavioral_problems', v)}
              options={behavioralProblemsOptions}
              placeholder="Выберите проблемы..."
              multiple
            />
            
            <SearchableSelect
              label="Цели дрессировки"
              value={formData.training_goals}
              onChange={(v) => handleChange('training_goals', v)}
              options={trainingGoalsOptions}
              placeholder="Выберите цели..."
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
            
            <OtherPetsField
              value={formData.other_pets}
              onChange={(v) => handleChange('other_pets', v)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Дата последнего осмотра
              </label>
              <input
                type="date"
                value={formData.last_vet_visit || ''}
                onChange={(e) => handleChange('last_vet_visit', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Вес (кг)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight || ''}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="Вес при осмотре"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
              <SelectField
                label="Оценка упитанности (BCS)"
                value={formData.body_condition_score}
                onChange={(v) => handleChange('body_condition_score', v)}
                options={bodyConditionOptions}
                placeholder="Шкала 1-9"
              />
            </div>
            
            <SelectField
              label="Состояние зубов"
              value={formData.dental_health}
              onChange={(v) => handleChange('dental_health', v)}
              options={DENTAL_HEALTH_OPTIONS}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ЧСС (уд/мин)</label>
                <input
                  type="number"
                  value={formData.heart_rate || ''}
                  onChange={(e) => handleChange('heart_rate', e.target.value)}
                  placeholder="60-180"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ЧДД (дых/мин)</label>
                <input
                  type="number"
                  value={formData.respiratory_rate || ''}
                  onChange={(e) => handleChange('respiratory_rate', e.target.value)}
                  placeholder="15-30"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Температура (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature || ''}
                  onChange={(e) => handleChange('temperature', e.target.value)}
                  placeholder="37.5-39.0"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Заметки ветеринара</label>
              <textarea
                value={formData.vet_notes || ''}
                onChange={(e) => handleChange('vet_notes', e.target.value)}
                placeholder="Дополнительные наблюдения и рекомендации врача..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all resize-none"
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800">
              Редактирование: {pet?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Расширенный профиль для персонализированных рекомендаций
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-100 p-4 space-y-2 flex-shrink-0 overflow-y-auto">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const progress = sectionProgress[section.id] || 0;
              
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left rounded-xl transition-all ${isActive ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`flex items-center gap-3 px-4 py-3 ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm flex-1">{section.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="px-4 pb-3">
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
                    'text-orange-600'
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
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span>Есть несохранённые изменения</span>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-100 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !hasChanges}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
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
      </motion.div>
    </div>
  );
}
