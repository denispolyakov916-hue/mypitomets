/**
 * PetWizard - Пошаговый wizard для создания PetID
 * 
 * Особенности:
 * - 4 простых шага для быстрого создания первичного профиля
 * - Автосохранение черновиков при выходе
 * - Живая карточка превью с прогрессом
 * - Автозаполнение из породы
 * - Удобная валидация в реальном времени
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  X, ChevronLeft, ChevronRight, Check, AlertCircle,
  Dog, Cat, Search, Camera, Sparkles, Heart, Calendar,
  CheckCircle2, PartyPopper, ArrowRight, RefreshCw, Trash2
} from 'lucide-react';
import {
  getBreeds,
  getBreedSuggestions,
  getPetAutofillSuggestions,
  getHealthConditions,
  getAllergies,
  addPetHealthCondition,
  addPetAllergy,
  ACTIVITY_LEVEL_OPTIONS,
  HOUSING_TYPE_OPTIONS,
  BEHAVIORAL_PROBLEMS,
  SIZE_OPTIONS,
  COAT_TYPE_OPTIONS,
  REPRODUCTIVE_STATE_OPTIONS,
  TEMPERAMENT_CHOICES,
  CLIMATE_CHOICES
} from '../../../api/pets';

// ============================================
// КОНСТАНТЫ И ХЕЛПЕРЫ
// ============================================

const STEPS = [
  { id: 1, title: 'Привет!', subtitle: 'Кто ваш питомец?' },
  { id: 2, title: 'Познакомимся', subtitle: 'Расскажите о нём' },
  { id: 3, title: 'Здоровье', subtitle: 'Особенности и уход' },
  { id: 4, title: 'Поведение', subtitle: 'Последний шаг!' }
];

const initialFormState = {
  name: '',
  species: '',
  breed: '',
  breedId: null,
  date_of_birth: null,
  weight: '',
  gender: '',
  photo: null,
  photoPreview: null,
  health_issues: [],
  excluded_ingredients: [],
  activity_level: '',
  housing_type: '',
  behavioral_problems: [],
  size_category: null,
  // Новые поля для автозаполнения
  coat_type: '',
  is_neutered: false,
  neutering_date: null,
  reproductive_state: 'none',
  temperament: '',
  climate: '',
  has_other_pets: false,
  // Автозаполняемые из породы
  ideal_weight_kg: null,
};

// Полные fallback-данные пород (когда API недоступен)
const FALLBACK_DOG_BREEDS = [
  { id: 'labrador', name: 'Лабрадор ретривер', size: 'large' },
  { id: 'german_shepherd', name: 'Немецкая овчарка', size: 'large' },
  { id: 'golden_retriever', name: 'Золотистый ретривер', size: 'large' },
  { id: 'french_bulldog', name: 'Французский бульдог', size: 'medium' },
  { id: 'yorkshire_terrier', name: 'Йоркширский терьер', size: 'small' },
  { id: 'pug', name: 'Мопс', size: 'small' },
  { id: 'chihuahua', name: 'Чихуахуа', size: 'small' },
  { id: 'dachshund', name: 'Такса', size: 'small' },
  { id: 'beagle', name: 'Бигль', size: 'medium' },
  { id: 'poodle', name: 'Пудель', size: 'medium' },
  { id: 'husky', name: 'Сибирский хаски', size: 'large' },
  { id: 'corgi', name: 'Вельш-корги', size: 'medium' },
  { id: 'shih_tzu', name: 'Ши-тцу', size: 'small' },
  { id: 'boxer', name: 'Боксёр', size: 'large' },
  { id: 'spitz', name: 'Шпиц', size: 'small' },
  { id: 'jack_russell', name: 'Джек-рассел-терьер', size: 'small' },
  { id: 'cocker_spaniel', name: 'Кокер-спаниель', size: 'medium' },
  { id: 'border_collie', name: 'Бордер-колли', size: 'medium' },
  { id: 'rottweiler', name: 'Ротвейлер', size: 'large' },
  { id: 'mixed', name: 'Метис / Беспородная', size: 'medium' },
];

const FALLBACK_CAT_BREEDS = [
  { id: 'british_shorthair', name: 'Британская короткошерстная', size: 'medium' },
  { id: 'scottish_fold', name: 'Шотландская вислоухая', size: 'medium' },
  { id: 'maine_coon', name: 'Мейн-кун', size: 'large' },
  { id: 'persian', name: 'Персидская', size: 'medium' },
  { id: 'sphynx', name: 'Сфинкс', size: 'medium' },
  { id: 'bengal', name: 'Бенгальская', size: 'medium' },
  { id: 'siamese', name: 'Сиамская', size: 'medium' },
  { id: 'russian_blue', name: 'Русская голубая', size: 'medium' },
  { id: 'ragdoll', name: 'Рэгдолл', size: 'large' },
  { id: 'abyssinian', name: 'Абиссинская', size: 'medium' },
  { id: 'siberian', name: 'Сибирская', size: 'large' },
  { id: 'devon_rex', name: 'Девон-рекс', size: 'small' },
  { id: 'norwegian_forest', name: 'Норвежская лесная', size: 'large' },
  { id: 'burmese', name: 'Бурманская', size: 'medium' },
  { id: 'exotic_shorthair', name: 'Экзотическая короткошерстная', size: 'medium' },
  { id: 'mixed_cat', name: 'Метис / Беспородная', size: 'medium' },
];

// Популярные породы для быстрого выбора (первые 4)
const POPULAR_DOG_BREEDS = FALLBACK_DOG_BREEDS.slice(0, 4);
const POPULAR_CAT_BREEDS = FALLBACK_CAT_BREEDS.slice(0, 4);

// Валидация веса по породе
const BREED_WEIGHT_RANGES = {
  'Лабрадор Ретривер': { min: 25, max: 35, obesity: 40 },
  'Немецкая овчарка': { min: 22, max: 40, obesity: 45 },
  'Чихуахуа': { min: 1.5, max: 3, obesity: 4 },
  'Йоркширский терьер': { min: 1.5, max: 3.5, obesity: 4.5 },
  'Мопс': { min: 6, max: 9, obesity: 11 },
  'Французский бульдог': { min: 8, max: 14, obesity: 17 },
  'Британская короткошерстная': { min: 3.5, max: 7, obesity: 9 },
  'Мейн-кун': { min: 4, max: 8, obesity: 10 },
  'Персидская': { min: 3, max: 5.5, obesity: 7 },
  'Сфинкс': { min: 3, max: 5.5, obesity: 7 },
};

// ============================================
// КОМПОНЕНТ ПРОГРЕСС-БАРА
// ============================================

const ProgressBar = ({ currentStep, totalSteps }) => {
  return (
    <div className="mb-6">
      {/* Шаги */}
      <div className="flex justify-between mb-3">
        {STEPS.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center gap-2 ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
              ${currentStep > step.id 
                ? 'bg-green-500 text-white' 
                : currentStep === step.id 
                  ? 'bg-primary-600 text-white ring-4 ring-primary-100' 
                  : 'bg-gray-100 text-gray-400'
              }
            `}>
              {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-1 rounded-full mx-2 transition-all ${
                currentStep > step.id ? 'bg-green-500' : 'bg-gray-100'
              }`} />
            )}
          </div>
        ))}
      </div>
      
      {/* Текущий шаг */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-800">{STEPS[currentStep - 1].title}</h3>
        <p className="text-sm text-gray-500">{STEPS[currentStep - 1].subtitle}</p>
      </div>
    </div>
  );
};

// ============================================
// КОМПОНЕНТ ПРЕВЬЮ КАРТОЧКИ ПИТОМЦА
// ============================================

const PetPreviewCard = React.memo(({ formData, completeness }) => {
  const getSpeciesEmoji = useCallback(() => {
    if (formData.species === 'dog') return '🐕';
    if (formData.species === 'cat') return '🐱';
    return '🐾';
  }, [formData.species]);

  const getSpeciesName = useCallback(() => {
    if (formData.species === 'dog') return 'Собака';
    if (formData.species === 'cat') return 'Кошка';
    return 'Питомец';
  }, [formData.species]);

  // Ограничиваем completeness до 100%
  const displayCompleteness = Math.min(completeness, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl p-5 border border-primary-100"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary-500" />
        <span className="text-sm font-medium text-primary-700">Превью профиля</span>
      </div>
      
      {/* Аватар */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
          {formData.photoPreview ? (
            <img src={formData.photoPreview} alt="Pet" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">{getSpeciesEmoji()}</span>
          )}
        </div>
        <div>
          <h4 className="font-bold text-gray-800 text-lg">
            {formData.name || 'Имя питомца'}
          </h4>
          <p className="text-sm text-gray-500">
            {formData.breed || getSpeciesName()}
          </p>
        </div>
      </div>

      {/* Характеристики */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {formData.weight && (
          <div className="bg-white rounded-xl p-2 text-center">
            <p className="text-xs text-gray-400">Вес</p>
            <p className="font-semibold text-gray-700">{formData.weight} кг</p>
          </div>
        )}
        {formData.gender && (
          <div className="bg-white rounded-xl p-2 text-center">
            <p className="text-xs text-gray-400">Пол</p>
            <p className="font-semibold text-gray-700">
              {formData.gender === 'male' ? '♂ Мальчик' : '♀ Девочка'}
            </p>
          </div>
        )}
      </div>

      {/* Прогресс первичного профиля */}
      <div className="bg-white rounded-xl p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Первичный профиль</span>
          <span className="text-sm font-bold text-primary-600">{displayCompleteness}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${displayCompleteness}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              displayCompleteness >= 100 ? 'bg-green-500' : 
              displayCompleteness >= 50 ? 'bg-yellow-500' : 'bg-primary-500'
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// МОДАЛЬНОЕ ОКНО УСПЕШНОГО СОЗДАНИЯ
// ============================================

const SuccessModal = ({ petName, onClose, onExtend }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
      >
        {/* Иконка успеха */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <PartyPopper className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Профиль создан! 🎉
        </h2>
        <p className="text-gray-500 mb-6">
          Первичный профиль <strong>{petName}</strong> успешно создан. 
          Теперь вы получите персонализированные рекомендации!
        </p>

        {/* Предложение расширить профиль */}
        <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-5 mb-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">
                Хотите рассказать больше?
              </h4>
              <p className="text-sm text-gray-600">
                Заполните расширенный профиль для ещё более точных рекомендаций по здоровью, питанию и уходу.
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
          >
            Позже
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            Заполнить
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// ШАГ 1: ВЫБОР ВИДА И ИМЕНИ
// ============================================

const Step1Species = ({ formData, onChange, errors }) => {
  const speciesOptions = [
    { value: 'dog', label: 'Собака', emoji: '🐕' },
    { value: 'cat', label: 'Кошка', emoji: '🐱' },
  ];

  return (
    <div className="space-y-6">
      {/* Выбор вида */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Кто ваш питомец? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {speciesOptions.map((option) => (
            <motion.button
              key={option.value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange('species', option.value)}
              className={`
                relative p-6 rounded-2xl border-2 transition-all text-center
                ${formData.species === option.value
                  ? 'border-primary-500 bg-primary-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50/50'
                }
              `}
            >
              {formData.species === option.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              <div className="text-5xl mb-3">{option.emoji}</div>
              <p className="font-semibold text-gray-800">{option.label}</p>
            </motion.button>
          ))}
        </div>
        {errors.species && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {errors.species}
          </p>
        )}
      </div>

      {/* Имя питомца */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Как зовут вашего питомца? <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => {
            // Ограничиваем ввод
            const value = e.target.value;
            if (value.length <= 50) {
              // Убираем лишние пробелы в начале, разрешаем только буквы, пробелы и дефисы
              const cleaned = value.replace(/^\s+/, '').replace(/[^a-zA-Zа-яА-ЯёЁ\s\-]/g, '');
              onChange('name', cleaned);
            }
          }}
          placeholder={formData.species === 'dog' ? 'Например: Барон, Рекс, Лаки' : 
                       formData.species === 'cat' ? 'Например: Мурка, Барсик, Снежок' : 
                       'Введите кличку'}
          maxLength={50}
          className={`
            w-full px-4 py-3.5 rounded-xl border-2 transition-all text-lg
            focus:outline-none focus:ring-4 focus:ring-primary-500/20
            ${errors.name 
              ? 'border-red-300 bg-red-50' 
              : formData.name && formData.name.trim().length >= 2
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-200 focus:border-primary-500'
            }
          `}
        />
        <div className="flex justify-between mt-1">
          {errors.name ? (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> {errors.name}
            </p>
          ) : formData.name && formData.name.trim().length >= 2 ? (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Отличное имя!
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">{formData.name?.length || 0}/50</span>
        </div>
      </div>

      {/* Фото (опционально) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Фото питомца <span className="text-gray-400">(необязательно)</span>
        </label>
        <div className="flex items-center gap-4">
          {formData.photoPreview ? (
            <div className="relative">
              <img 
                src={formData.photoPreview} 
                alt="Preview" 
                className="w-24 h-24 rounded-2xl object-cover border-2 border-primary-200"
              />
              <button
                type="button"
                onClick={() => {
                  onChange('photo', null);
                  onChange('photoPreview', null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
              <Camera className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">Добавить</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onChange('photo', file);
                    onChange('photoPreview', URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          )}
          <div className="text-sm text-gray-500">
            <p>Загрузите фото вашего питомца</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG до 5 МБ</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ШАГ 2: ОСНОВНАЯ ИНФОРМАЦИЯ
// ============================================

const Step2Info = ({ formData, onChange, errors, breeds, loadingBreeds, onBreedSelect }) => {
  const [breedSearch, setBreedSearch] = useState(formData.breed || '');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [activeBreedIndex, setActiveBreedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listboxIdRef = useRef(`wizard-breed-listbox-${Math.random().toString(36).slice(2)}`);

  // Используем API породы или fallback
  const fallbackBreeds = formData.species === 'dog' ? FALLBACK_DOG_BREEDS : FALLBACK_CAT_BREEDS;
  const availableBreeds = breeds.length > 0 ? breeds : fallbackBreeds;
  const popularBreeds = formData.species === 'dog' ? POPULAR_DOG_BREEDS : POPULAR_CAT_BREEDS;
  
  // Фильтрация пород
  const filteredBreeds = useMemo(() => {
    if (!breedSearch.trim()) return availableBreeds;
    const search = breedSearch.toLowerCase().trim();
    return availableBreeds.filter(b => 
      b.name.toLowerCase().includes(search)
    );
  }, [availableBreeds, breedSearch]);
  const visibleBreeds = useMemo(() => filteredBreeds.slice(0, 20), [filteredBreeds]);

  // Обработчик выбора породы
  const handleBreedSelect = useCallback((breed) => {
    setBreedSearch(breed.name);
    setShowBreedDropdown(false);
    onChange('breed', breed.name);
    onChange('breedId', parseInt(breed.id, 10));
    // Установим размер из породы если есть
    if (breed.size) {
      onChange('size_category', breed.size);
    }
    // Вызываем callback для загрузки подсказок
    onBreedSelect(breed);
  }, [onChange, onBreedSelect]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowBreedDropdown(false);
      }
    };
    
    if (showBreedDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBreedDropdown]);

  // Валидация веса с учётом вида и размера
  const getWeightValidation = useCallback(() => {
    if (!formData.weight) return null;
    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight <= 0) return { type: 'error', message: 'Введите корректный вес' };
    if (weight < 0.3) return { type: 'error', message: 'Минимальный вес 0.3 кг' };
    
    // Лимиты по виду
    if (formData.species === 'dog') {
      if (weight > 100) return { type: 'error', message: 'Максимальный вес собаки 100 кг' };
      if (weight > 80) return { type: 'warning', message: 'Очень крупная собака' };
    } else if (formData.species === 'cat') {
      if (weight > 20) return { type: 'error', message: 'Максимальный вес кошки 20 кг' };
      if (weight > 10) return { type: 'warning', message: 'Крупная кошка или избыточный вес' };
    }
    
    // Проверка по известным породам
    const breedRange = BREED_WEIGHT_RANGES[formData.breed];
    if (breedRange) {
      if (weight < breedRange.min * 0.7) return { type: 'warning', message: `Вес ниже нормы для породы (${breedRange.min}-${breedRange.max} кг)` };
      if (weight > breedRange.obesity) return { type: 'warning', message: 'Возможен избыточный вес' };
      return { type: 'success', message: `Вес в норме для ${formData.breed}` };
    }
    
    return { type: 'success', message: '' };
  }, [formData.weight, formData.species, formData.breed]);

  const weightValidation = getWeightValidation();

  // Синхронизация поиска с выбранной породой
  useEffect(() => {
    if (formData.breed && breedSearch !== formData.breed) {
      setBreedSearch(formData.breed);
    }
  }, [formData.breed]);

  useEffect(() => {
    if (!showBreedDropdown) {
      setActiveBreedIndex(-1);
      return;
    }
    if (visibleBreeds.length === 0) {
      setActiveBreedIndex(-1);
      return;
    }
    const selectedIndex = formData.breed
      ? visibleBreeds.findIndex((breed) => breed.name === formData.breed)
      : -1;
    setActiveBreedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [showBreedDropdown, visibleBreeds, formData.breed]);

  const moveActiveIndex = (delta) => {
    if (visibleBreeds.length === 0) return;
    setActiveBreedIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return visibleBreeds.length - 1;
      if (next >= visibleBreeds.length) return 0;
      return next;
    });
  };

  // Расчёт возраста для отображения
  const calculateAge = useCallback((birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    
    if (months < 1) return 'меньше месяца';
    if (months < 12) return `${months} мес.`;
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    }
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${remainingMonths} мес.`;
  }, []);

  return (
    <div className="space-y-5">
      {/* Порода */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Порода <span className="text-red-500">*</span>
        </label>
        
        {/* Популярные породы (когда ничего не выбрано) */}
        {!formData.breed && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Популярные породы:</p>
            <div className="flex flex-wrap gap-2">
              {popularBreeds.map(breed => (
                <button
                  key={breed.id}
                  type="button"
                  onClick={() => handleBreedSelect(breed)}
                  className="px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors"
                >
                  {breed.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Поиск породы */}
        <div className="relative" ref={inputRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={breedSearch}
            onChange={(e) => {
              setBreedSearch(e.target.value);
              setShowBreedDropdown(true);
              if (!e.target.value.trim()) {
                onChange('breed', '');
                onChange('breedId', null);
              }
            }}
            onFocus={() => setShowBreedDropdown(true)}
            placeholder={loadingBreeds ? 'Загрузка пород...' : 'Начните вводить или выберите из списка'}
            className={`
              w-full pl-10 pr-10 py-3 rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4 focus:ring-primary-500/20
              ${errors.breed 
                ? 'border-red-300 bg-red-50' 
                : formData.breed 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 focus:border-primary-500'
              }
            `}
            role="combobox"
            aria-expanded={showBreedDropdown}
            aria-controls={listboxIdRef.current}
            aria-activedescendant={
              activeBreedIndex >= 0 ? `${listboxIdRef.current}-opt-${activeBreedIndex}` : undefined
            }
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!showBreedDropdown) setShowBreedDropdown(true);
                moveActiveIndex(1);
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!showBreedDropdown) setShowBreedDropdown(true);
                moveActiveIndex(-1);
                return;
              }
              if (e.key === 'Home') {
                e.preventDefault();
              if (visibleBreeds.length > 0) setActiveBreedIndex(0);
                return;
              }
              if (e.key === 'End') {
                e.preventDefault();
              if (visibleBreeds.length > 0) {
                setActiveBreedIndex(visibleBreeds.length - 1);
                }
                return;
              }
              if (e.key === 'Enter' && showBreedDropdown && activeBreedIndex >= 0) {
                e.preventDefault();
              handleBreedSelect(visibleBreeds[activeBreedIndex]);
                return;
              }
              if (e.key === 'Escape' && showBreedDropdown) {
                e.preventDefault();
                e.stopPropagation();
                setShowBreedDropdown(false);
              }
            }}
          />
          {formData.breed ? (
            <button
              type="button"
              onClick={() => {
                setBreedSearch('');
                onChange('breed', '');
                onChange('breedId', null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          ) : loadingBreeds ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : null}
        </div>

        {/* Dropdown пород */}
        <AnimatePresence>
          {showBreedDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-60 overflow-y-auto"
              id={listboxIdRef.current}
              role="listbox"
            >
              {visibleBreeds.length > 0 ? (
                visibleBreeds.map((breed, index) => (
                  <button
                    key={breed.id}
                    type="button"
                    onClick={() => handleBreedSelect(breed)}
                    id={`${listboxIdRef.current}-opt-${index}`}
                    role="option"
                    aria-selected={activeBreedIndex === index}
                    tabIndex={-1}
                    className={`
                      w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between
                      ${activeBreedIndex === index
                        ? 'bg-primary-100 text-primary-700'
                        : formData.breed === breed.name
                          ? 'bg-primary-50'
                          : 'hover:bg-gray-50'}
                    `}
                  >
                    <span className="font-medium text-gray-700">{breed.name}</span>
                    {formData.breed === breed.name && (
                      <Check className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-gray-500 text-sm">
                  Порода не найдена. Выберите "Метис" или введите название вручную.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {errors.breed && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {errors.breed}
          </p>
        )}
      </div>

      {/* Пол и дата рождения */}
      <div className="grid grid-cols-2 gap-4">
        {/* Пол */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Пол <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'male', label: 'Мальчик', emoji: '♂️' },
              { value: 'female', label: 'Девочка', emoji: '♀️' }
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange('gender', option.value)}
                className={`
                  p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
                  ${formData.gender === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                  }
                `}
              >
                <span>{option.emoji}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
          {errors.gender && (
            <p className="mt-2 text-sm text-red-600">{errors.gender}</p>
          )}
        </div>

        {/* Дата рождения */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата рождения <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <DatePicker
              selected={formData.date_of_birth}
              onChange={(date) => onChange('date_of_birth', date)}
              dateFormat="dd.MM.yyyy"
              placeholderText="Выберите дату"
              maxDate={new Date()}
              minDate={new Date(new Date().getFullYear() - 30, 0, 1)}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              className={`
                w-full px-4 py-3 rounded-xl border-2 transition-all
                focus:outline-none focus:ring-4 focus:ring-primary-500/20
                ${errors.date_of_birth 
                  ? 'border-red-300 bg-red-50' 
                  : formData.date_of_birth 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 focus:border-primary-500'
                }
              `}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {formData.date_of_birth && (
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Возраст: {calculateAge(formData.date_of_birth)}
            </p>
          )}
          {errors.date_of_birth && (
            <p className="mt-2 text-sm text-red-600">{errors.date_of_birth}</p>
          )}
        </div>
      </div>

      {/* Вес */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Текущий вес (кг) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.1"
            min="0.3"
            max={formData.species === 'cat' ? 20 : 100}
            value={formData.weight}
            onChange={(e) => {
              const val = e.target.value;
              // Ограничиваем ввод
              if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= (formData.species === 'cat' ? 20 : 100))) {
                onChange('weight', val);
              }
            }}
            placeholder={formData.species === 'cat' ? 'От 0.3 до 20 кг' : 'От 0.3 до 100 кг'}
            className={`
              w-full px-4 py-3 rounded-xl border-2 transition-all
              focus:outline-none focus:ring-4 focus:ring-primary-500/20
              ${weightValidation?.type === 'error'
                ? 'border-red-300 bg-red-50'
                : weightValidation?.type === 'warning'
                  ? 'border-yellow-300 bg-yellow-50'
                  : weightValidation?.type === 'success' && weightValidation?.message
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 focus:border-primary-500'
              }
            `}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">кг</span>
        </div>
        {weightValidation?.message && (
          <p className={`mt-2 text-sm flex items-center gap-1 ${
            weightValidation.type === 'error' ? 'text-red-600' :
            weightValidation.type === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {weightValidation.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {weightValidation.message}
          </p>
        )}
        {errors.weight && !weightValidation?.message && (
          <p className="mt-2 text-sm text-red-600">{errors.weight}</p>
        )}
      </div>
    </div>
  );
};

// ============================================
// ШАГ 3: ЗДОРОВЬЕ И ОСОБЕННОСТИ
// ============================================

const Step3Health = ({
  formData,
  onChange,
  errors,
  healthOptions,
  allergyOptions,
  isHealthOptionsLoading,
  isAllergyOptionsLoading
}) => {
  const [showHealthOptions, setShowHealthOptions] = useState(false);
  const [showAllergyOptions, setShowAllergyOptions] = useState(false);

  const handleQuickAction = (field, value) => {
    onChange(field, [value]);
  };

  const toggleOption = (field, value) => {
    const current = formData[field] || [];
    // Если выбираем "none", сбрасываем все остальные
    if (value === 'none') {
      onChange(field, ['none']);
      return;
    }
    // Если уже есть "none", убираем его
    let newValues = current.filter(v => v !== 'none');
    if (current.includes(value)) {
      newValues = newValues.filter(v => v !== value);
    } else {
      newValues = [...newValues, value];
    }
    onChange(field, newValues.length > 0 ? newValues : []);
  };

  return (
    <div className="space-y-6">
      {/* Проблемы со здоровьем */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Есть ли проблемы со здоровьем? <span className="text-red-500">*</span>
        </label>
        
        {/* Быстрые действия */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleQuickAction('health_issues', 'none')}
            className={`
              flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
              ${formData.health_issues.includes('none')
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-200 hover:bg-green-50'
              }
            `}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Всё отлично!</span>
          </button>
          <button
            type="button"
            onClick={() => setShowHealthOptions(!showHealthOptions)}
            className={`
              px-4 py-3 rounded-xl border-2 transition-all
              ${formData.health_issues.length > 0 && !formData.health_issues.includes('none')
                ? 'border-accent-500 bg-accent-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {formData.health_issues.length > 0 && !formData.health_issues.includes('none')
              ? `${formData.health_issues.length} выбрано`
              : 'Выбрать проблемы'
            }
          </button>
        </div>

        {/* Список проблем */}
        <AnimatePresence>
          {showHealthOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {isHealthOptionsLoading ? (
                <div className="text-sm text-gray-500 py-2">Загрузка списка заболеваний...</div>
              ) : healthOptions.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">Список заболеваний пока пуст</div>
              ) : (
                healthOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption('health_issues', option.value)}
                    className={`
                      w-full px-4 py-2.5 rounded-xl border transition-all flex items-center gap-3 text-left
                      ${formData.health_issues.includes(option.value)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded-md border-2 flex items-center justify-center
                      ${formData.health_issues.includes(option.value)
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                      }
                    `}>
                      {formData.health_issues.includes(option.value) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-gray-700">{option.label}</span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {errors.health_issues && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {errors.health_issues}
          </p>
        )}
      </div>

      {/* Аллергии */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Аллергии или непереносимость продуктов? <span className="text-red-500">*</span>
        </label>
        
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleQuickAction('excluded_ingredients', 'none')}
            className={`
              flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
              ${formData.excluded_ingredients.includes('none')
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-200 hover:bg-green-50'
              }
            `}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Нет аллергий</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAllergyOptions(!showAllergyOptions)}
            className={`
              px-4 py-3 rounded-xl border-2 transition-all
              ${formData.excluded_ingredients.length > 0 && !formData.excluded_ingredients.includes('none')
                ? 'border-accent-500 bg-accent-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {formData.excluded_ingredients.length > 0 && !formData.excluded_ingredients.includes('none')
              ? `${formData.excluded_ingredients.length} выбрано`
              : 'Указать аллергены'
            }
          </button>
        </div>

        <AnimatePresence>
          {showAllergyOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2 overflow-hidden"
            >
              {isAllergyOptionsLoading ? (
                <div className="text-sm text-gray-500 py-2 col-span-2">Загрузка списка аллергий...</div>
              ) : allergyOptions.length === 0 ? (
                <div className="text-sm text-gray-500 py-2 col-span-2">Список аллергий пока пуст</div>
              ) : (
                allergyOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption('excluded_ingredients', option.value)}
                    className={`
                      px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-sm
                      ${formData.excluded_ingredients.includes(option.value)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      w-4 h-4 rounded border flex items-center justify-center
                      ${formData.excluded_ingredients.includes(option.value)
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                      }
                    `}>
                      {formData.excluded_ingredients.includes(option.value) && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    <span className="text-gray-700">{option.label}</span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {errors.excluded_ingredients && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {errors.excluded_ingredients}
          </p>
        )}
      </div>

      {/* Уровень активности (собаки) или Тип жилья (кошки) */}
      {formData.species === 'dog' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Уровень активности <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-5 gap-2">
            {ACTIVITY_LEVEL_OPTIONS.map(option => {
              // Иконки для 5 уровней активности
              const activityIcons = {
                'very_low': '😴',
                'low': '🐌', 
                'medium': '🐕',
                'high': '🏃',
                'very_high': '🚀'
              };
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange('activity_level', option.value)}
                  className={`
                    p-2 rounded-xl border-2 transition-all text-center
                    ${formData.activity_level === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-200'
                    }
                  `}
                >
                  <div className="text-xl mb-1">
                    {activityIcons[option.value] || '🐕'}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{option.label}</span>
                </button>
              );
            })}
          </div>
          {errors.activity_level && (
            <p className="mt-2 text-sm text-red-600">{errors.activity_level}</p>
          )}
        </div>
      ) : formData.species === 'cat' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Где живёт ваша кошка? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {HOUSING_TYPE_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange('housing_type', option.value)}
                className={`
                  p-3 rounded-xl border-2 transition-all text-center
                  ${formData.housing_type === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                  }
                `}
              >
                <div className="text-2xl mb-1">
                  {option.value === 'apartment' ? '🏢' : 
                   option.value === 'house' ? '🏠' : 
                   option.value === 'cottage' ? '🏡' : '🏘️'}
                </div>
                <span className="text-sm font-medium text-gray-700">{option.label}</span>
              </button>
            ))}
          </div>
          {errors.housing_type && (
            <p className="mt-2 text-sm text-red-600">{errors.housing_type}</p>
          )}
        </div>
      ) : null}
    </div>
  );
};

// ============================================
// ШАГ 4: ПОВЕДЕНИЕ
// ============================================

const Step4Behavior = ({ formData, onChange, errors }) => {
  const [showBehaviorOptions, setShowBehaviorOptions] = useState(false);

  const toggleProblem = (problem) => {
    const current = formData.behavioral_problems || [];
    // Если выбираем "Нет проблем"
    if (problem === 'Нет проблем') {
      onChange('behavioral_problems', ['Нет проблем']);
      return;
    }
    // Убираем "Нет проблем" если выбираем другое
    let newValues = current.filter(v => v !== 'Нет проблем');
    if (current.includes(problem)) {
      newValues = newValues.filter(v => v !== problem);
    } else {
      newValues = [...newValues, problem];
    }
    onChange('behavioral_problems', newValues.length > 0 ? newValues : []);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Есть ли поведенческие проблемы? <span className="text-red-500">*</span>
        </label>
        
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => onChange('behavioral_problems', ['Нет проблем'])}
            className={`
              flex-1 px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2
              ${formData.behavioral_problems.includes('Нет проблем')
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-200 hover:bg-green-50'
              }
            `}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Всё хорошо!</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBehaviorOptions(!showBehaviorOptions)}
            className={`
              px-4 py-3 rounded-xl border-2 transition-all
              ${formData.behavioral_problems.length > 0 && !formData.behavioral_problems.includes('Нет проблем')
                ? 'border-accent-500 bg-accent-50'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {formData.behavioral_problems.length > 0 && !formData.behavioral_problems.includes('Нет проблем')
              ? `${formData.behavioral_problems.length} выбрано`
              : 'Выбрать проблемы'
            }
          </button>
        </div>

        <AnimatePresence>
          {showBehaviorOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2 overflow-hidden"
            >
              {BEHAVIORAL_PROBLEMS.map(problem => (
                <button
                  key={problem}
                  type="button"
                  onClick={() => toggleProblem(problem)}
                  className={`
                    px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm text-left
                    ${formData.behavioral_problems.includes(problem)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center
                    ${formData.behavioral_problems.includes(problem)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                    }
                  `}>
                    {formData.behavioral_problems.includes(problem) && (
                      <Check className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                  <span className="text-gray-700">{problem}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {errors.behavioral_problems && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {errors.behavioral_problems}
          </p>
        )}
      </div>

      {/* Итоговая информация */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-5 border border-primary-100">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-primary-500" />
          <span className="font-semibold text-gray-800">Почти готово!</span>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          После создания профиля вы получите:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-gray-600">
            <Check className="w-4 h-4 text-green-500" />
            Персонализированные рекомендации по уходу
          </li>
          <li className="flex items-center gap-2 text-gray-600">
            <Check className="w-4 h-4 text-green-500" />
            Подбор кормов и товаров под вашего питомца
          </li>
          <li className="flex items-center gap-2 text-gray-600">
            <Check className="w-4 h-4 text-green-500" />
            Курсы обучения по уровню подготовки
          </li>
        </ul>
      </div>
    </div>
  );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ WIZARD
// ============================================

// Локальный ключ для автосохранения
const DRAFT_STORAGE_KEY = 'pet_wizard_draft';

export default function PetWizard({ onClose, onSubmit, isLoading, editingDraft = null }) {
  // Восстановление данных из localStorage при первой загрузке
  const [currentStep, setCurrentStep] = useState(() => {
    if (editingDraft?.draft_step) return editingDraft.draft_step;
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.draft_step || 1;
      } catch (e) { return 1; }
    }
    return 1;
  });
  
  const [formData, setFormData] = useState(() => {
    if (editingDraft) {
      return {
        ...initialFormState,
        ...editingDraft,
        date_of_birth: editingDraft.date_of_birth ? new Date(editingDraft.date_of_birth) : null,
      };
    }
    // Проверяем localStorage
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...initialFormState,
          ...parsed,
          date_of_birth: parsed.date_of_birth ? new Date(parsed.date_of_birth) : null,
        };
      } catch (e) { return initialFormState; }
    }
    return initialFormState;
  });
  
  const [errors, setErrors] = useState({});
  const [breeds, setBreeds] = useState([]);
  const [loadingBreeds, setLoadingBreeds] = useState(false);
  const [breedSuggestions, setBreedSuggestions] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPetName, setCreatedPetName] = useState('');
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState(false);
  const [healthConditionOptions, setHealthConditionOptions] = useState([]);
  const [allergyOptions, setAllergyOptions] = useState([]);
  const [loadingHealthOptions, setLoadingHealthOptions] = useState(false);
  const [loadingAllergyOptions, setLoadingAllergyOptions] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(() => {
    if (editingDraft) return false;
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    return !!saved;
  });
  
  // Очистить восстановленные данные из localStorage
  const handleClearRestoredData = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFormData(initialFormState);
    setCurrentStep(1);
    setRestoredFromStorage(false);
  };

  // Автосохранение в localStorage при изменении данных
  useEffect(() => {
    const hasData = formData.name || formData.species;
    if (hasData) {
      const dataToSave = {
        ...formData,
        date_of_birth: formData.date_of_birth 
          ? formData.date_of_birth.toISOString().split('T')[0] 
          : null,
        draft_step: currentStep,
      };
      // Не сохраняем фото в localStorage (слишком большое)
      delete dataToSave.photo;
      delete dataToSave.photoPreview;
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [formData, currentStep]);

  // Загрузка пород при выборе вида
  useEffect(() => {
    if (formData.species && ['dog', 'cat'].includes(formData.species)) {
      loadBreeds(formData.species);
    } else {
      setBreeds([]);
    }
  }, [formData.species]);

  useEffect(() => {
    if (!formData.species) return;

    let isMounted = true;

    const loadHealthOptions = async () => {
      setLoadingHealthOptions(true);
      setLoadingAllergyOptions(true);
      try {
        const [conditionsResponse, allergiesResponse] = await Promise.all([
          getHealthConditions({ species: formData.species }),
          getAllergies({ animal_type: formData.species })
        ]);

        const conditions = conditionsResponse?.results || conditionsResponse?.data || conditionsResponse || [];
        const allergies = allergiesResponse?.results || allergiesResponse?.data || allergiesResponse || [];

        if (isMounted) {
          setHealthConditionOptions(conditions);
          setAllergyOptions(allergies);
        }
      } catch (error) {
        console.error('Ошибка загрузки заболеваний/аллергий:', error);
        if (isMounted) {
          setHealthConditionOptions([]);
          setAllergyOptions([]);
        }
      } finally {
        if (isMounted) {
          setLoadingHealthOptions(false);
          setLoadingAllergyOptions(false);
        }
      }
    };

    loadHealthOptions();

    return () => {
      isMounted = false;
    };
  }, [formData.species]);

  const loadBreeds = async (species) => {
    setLoadingBreeds(true);
    try {
      const response = await getBreeds({ species, limit: 200 });
      setBreeds(response.breeds || []);
    } catch (error) {
      console.error('Ошибка загрузки пород:', error);
    } finally {
      setLoadingBreeds(false);
    }
  };

  const healthIssueOptions = useMemo(
    () => (healthConditionOptions || []).map((condition) => ({
      value: condition.code,
      label: condition.name_ru
    })),
    [healthConditionOptions]
  );

  const allergyIssueOptions = useMemo(
    () => (allergyOptions || []).map((allergy) => ({
      value: allergy.code,
      label: allergy.display_name
    })),
    [allergyOptions]
  );

  // Обработка выбора породы с автозаполнением из API
  const handleBreedSelect = async (breed) => {
    setFormData(prev => ({
      ...prev,
      breed: breed.name,
      breedId: breed.id,
      size_category: breed.size || prev.size_category,
    }));

    // Загружаем подсказки автозаполнения из нового API
    if (breed.id) {
      try {
        // Используем новый endpoint автозаполнения
        const autofillData = await getPetAutofillSuggestions(breed.id, formData.species);
        setBreedSuggestions(autofillData);
        
        // Автозаполнение из данных породы
        if (autofillData?.suggestions) {
          const suggestions = autofillData.suggestions;
          setFormData(prev => ({
            ...prev,
            activity_level: suggestions.activity_level || prev.activity_level,
            size_category: suggestions.size_category || prev.size_category,
            coat_type: suggestions.coat_type || prev.coat_type,
            ideal_weight_kg: suggestions.ideal_weight_kg || prev.ideal_weight_kg,
          }));
        }
        
        // Также пробуем старый API для совместимости
        if (!autofillData?.suggestions && breed.id.includes && breed.id.includes('-')) {
          const suggestions = await getBreedSuggestions(breed.id);
          setBreedSuggestions(suggestions);
          
          if (suggestions?.suggestions) {
            setFormData(prev => ({
              ...prev,
              activity_level: suggestions.suggestions.activity_level || prev.activity_level,
              size_category: suggestions.suggestions.size || prev.size_category,
            }));
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки автозаполнения:', error);
        // Не показываем ошибку пользователю - это не критично
      }
    }
  };

  // Обработка изменений формы (оптимизирована)
  const handleChange = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Сброс при смене вида
      if (field === 'species') {
        return {
          ...newData,
          breed: '',
          breedId: null,
          activity_level: '',
          housing_type: '',
        };
      }

      return newData;
    });

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Сброс подсказок при смене вида
    if (field === 'species') {
      setBreedSuggestions(null);
    }
  }, [errors]);

  // Валидация шага
  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.species) newErrors.species = 'Выберите вид животного (собака или кошка)';
        if (!formData.name.trim()) {
          newErrors.name = 'Введите кличку питомца. Поле обязательно для заполнения';
        } else if (formData.name.trim().length < 2) {
          newErrors.name = 'Кличка должна содержать минимум 2 символа';
        } else if (formData.name.trim().length > 50) {
          newErrors.name = 'Кличка не должна превышать 50 символов';
        }
        break;
      case 2:
        if (!formData.breed || formData.breed.trim().length < 2) {
          newErrors.breed = 'Выберите породу из списка или введите название породы (минимум 2 символа)';
        }
        if (!formData.gender) newErrors.gender = 'Выберите пол питомца из списка';
        if (!formData.date_of_birth) {
          newErrors.date_of_birth = 'Укажите дату рождения питомца. Это необходимо для точных рекомендаций';
        }
        if (!formData.weight) {
          newErrors.weight = 'Введите вес питомца в килограммах (например: 5.5)';
        } else {
          const weight = parseFloat(formData.weight);
          if (isNaN(weight) || weight < 0.3) {
            newErrors.weight = 'Вес не может быть меньше 0.3 кг. Проверьте правильность ввода';
          } else if (formData.species === 'cat' && weight > 20) {
            newErrors.weight = 'Вес кошки не может превышать 20 кг. Проверьте правильность ввода';
          } else if (formData.species === 'dog' && weight > 100) {
            newErrors.weight = 'Вес собаки не может превышать 100 кг. Проверьте правильность ввода';
          }
        }
        break;
      case 3:
        if (formData.health_issues.length === 0) {
          newErrors.health_issues = 'Укажите состояние здоровья питомца. Если проблем нет, выберите "Здоров"';
        }
        if (formData.excluded_ingredients.length === 0) {
          newErrors.excluded_ingredients = 'Укажите информацию об аллергиях. Если аллергий нет, выберите "Нет аллергий"';
        }
        if (formData.species === 'dog' && !formData.activity_level) {
          newErrors.activity_level = 'Выберите уровень активности собаки для персонализации рекомендаций';
        }
        if (formData.species === 'cat' && !formData.housing_type) {
          newErrors.housing_type = 'Выберите тип жилья кошки (квартира или дом)';
        }
        break;
      case 4:
        if (formData.behavioral_problems.length === 0) {
          newErrors.behavioral_problems = 'Укажите информацию о поведении. Если проблем нет, выберите "Нет проблем"';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Расчёт прогресса первичного профиля (max 100%)
  const calculateCompleteness = useMemo(() => {
    // Обязательные поля для первичного профиля
    const requiredFields = [
      { filled: !!formData.name, weight: 1 },
      { filled: !!formData.species, weight: 1 },
      { filled: !!formData.breed, weight: 1 },
      { filled: !!formData.gender, weight: 1 },
      { filled: !!formData.date_of_birth, weight: 1 },
      { filled: !!formData.weight, weight: 1 },
      { filled: formData.health_issues.length > 0, weight: 1 },
      { filled: formData.excluded_ingredients.length > 0, weight: 1 },
      { filled: formData.species === 'dog' ? !!formData.activity_level : !!formData.housing_type, weight: 1 },
      { filled: formData.behavioral_problems.length > 0, weight: 1 },
    ];
    
    const totalWeight = requiredFields.reduce((sum, f) => sum + f.weight, 0);
    const filledWeight = requiredFields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
    
    return Math.round((filledWeight / totalWeight) * 100);
  }, [formData]);

  // Переход к следующему шагу
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        setRestoredFromStorage(false); // Скрываем уведомление при переходе
      } else {
        handleSubmit();
      }
    }
  };

  // Переход к предыдущему шагу
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Сохранение как черновик
  const handleSaveDraft = async (closeAfterSave = false) => {
    // Проверяем минимальные данные
    if (!formData.name && !formData.species) {
      if (closeAfterSave) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        onClose();
      }
      return;
    }
    
    setIsSavingDraft(true);
    try {
    // Если breedId не установлен, но есть название породы, попробуем найти ID
    let finalBreedId = formData.breedId;
    let foundBreed = null;
    if ((!finalBreedId || finalBreedId === '') && formData.breed && formData.breed.trim()) {
      // Ищем породу по названию в массиве breeds (гибкий поиск)
      const breedName = formData.breed.toLowerCase().trim();
      foundBreed = breeds.find(b => {
        const dbName = b.name.toLowerCase();
        // Проверяем различные варианты совпадений
        return dbName.includes(breedName) || // "лабрадор" в "лабрадор ретривер"
               breedName.includes(dbName.split(' ')[0]) || // "лабрадор" в "лабрадор"
               dbName.replace(' ', '').includes(breedName) || // "лабрадорретрiever" содержит "лабрадор"
               breedName.replace(' ', '').includes(dbName.split(' ')[0]); // "лабрадорретрiever" содержит "лабрадор"
      });

      if (foundBreed) {
        finalBreedId = parseInt(foundBreed.id, 10);
      }
    }

      const draftData = {
        name: formData.name || 'Без имени',
        species: formData.species || 'dog',
        breed_id: (finalBreedId && finalBreedId !== '') ? finalBreedId : null,
        date_of_birth: formData.date_of_birth 
          ? formData.date_of_birth.toISOString().split('T')[0] 
          : null,
        weight_kg: formData.weight ? parseFloat(formData.weight) : null,
        sex: formData.gender || null,
        activity_level: formData.activity_level || 'moderate',
        housing_type: formData.housing_type || null,
        behavioral_problems: formData.behavioral_problems || [],
        size_category: formData.size_category || null,
        coat_type: formData.coat_type || null,
        is_neutered: formData.is_neutered || false,
        reproductive_state: formData.reproductive_state || 'none',
        temperament: formData.temperament || null,
        living_climate: formData.climate || null,
        has_other_pets: formData.has_other_pets || false,
        ideal_weight_kg: formData.ideal_weight_kg || null,
        is_draft: true,
        draft_step: currentStep,
      };
      
      await onSubmit(draftData, true);
      
      // Очищаем localStorage после успешного сохранения
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      
      if (closeAfterSave) {
        onClose();
      } else {
        // Показываем сообщение об успешном сохранении
        setDraftSavedMessage(true);
        setTimeout(() => setDraftSavedMessage(false), 3000);
      }
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Финальная отправка
  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    // Если breedId не установлен, но есть название породы, попробуем найти ID
    let finalBreedId = formData.breedId;
    let foundBreed = null;
    if ((!finalBreedId || finalBreedId === '') && formData.breed && formData.breed.trim()) {
      // Ищем породу по названию в массиве breeds (гибкий поиск)
      let breedName = formData.breed.toLowerCase().trim();

      // Заменяем распространенные слова для лучшего поиска
      const replacements = {
        'french': 'english',
        'американский': 'американская',
        'немецкий': 'немецкая',
        'английский': 'английская',
        '_': ' ', // Заменяем подчеркивания на пробелы
      };

      for (const [from, to] of Object.entries(replacements)) {
        breedName = breedName.replace(new RegExp(from, 'gi'), to);
      }

      foundBreed = breeds.find(b => {
        const dbName = b.name.toLowerCase();
        const dbNameEn = (b.name_en || '').toLowerCase();
        // Проверяем различные варианты совпадений
        const match1 = dbName.includes(breedName);
        const match2 = breedName.includes(dbName.split(' ')[0]);
        const match3 = dbName.replace(' ', '').includes(breedName);
        const match4 = breedName.replace(' ', '').includes(dbName.split(' ')[0]);
        const match5 = dbNameEn.includes(breedName); // Поиск по английскому названию
        const match6 = breedName.includes(dbNameEn.split(' ')[0]); // Поиск по английскому названию

        return match1 || match2 || match3 || match4 || match5 || match6;
      });

      // Если не найдено, попробуем транслитерацию английских названий
      if (!foundBreed && /^[a-z\s]+$/.test(breedName)) {
        const translitMap = {
          'labrador': 'лабрадор',
          'retriever': 'ретривер',
          'german': 'немецкая',
          'shepherd': 'овчарка',
          'golden': 'золотистый',
          'bulldog': 'бульдог',
          'poodle': 'пудель',
          'beagle': 'бигль',
          'husky': 'хаски',
          'pug': 'мопс',
          'chihuahua': 'чихуахуа',
          'yorkshire': 'йоркширский',
          'terrier': 'терьер'
        };

        let translatedName = breedName;
        for (const [eng, rus] of Object.entries(translitMap)) {
          translatedName = translatedName.replace(new RegExp('\\b' + eng + '\\b', 'gi'), rus);
        }

        if (translatedName !== breedName) {
          foundBreed = breeds.find(b => {
            const dbName = b.name.toLowerCase();
            return dbName.includes(translatedName) ||
                   translatedName.includes(dbName.split(' ')[0]);
          });
        }
      }

      if (foundBreed) {
        finalBreedId = parseInt(foundBreed.id, 10);
      }
    }

    const submitData = {
      name: formData.name.trim(),
      species: formData.species,
      breed_id: (finalBreedId && finalBreedId !== '') ? finalBreedId : null,
      date_of_birth: formData.date_of_birth
        ? formData.date_of_birth.toISOString().split('T')[0]
        : null,
      weight_kg: formData.weight ? parseFloat(formData.weight) : null,
      sex: formData.gender,
      activity_level: formData.activity_level || 'moderate',
      housing_type: formData.housing_type || null,
      behavioral_problems: formData.behavioral_problems.includes('Нет проблем') ? [] : formData.behavioral_problems,
      size_category: formData.size_category,
      // Новые поля
      coat_type: formData.coat_type || null,
      is_neutered: formData.is_neutered || false,
      reproductive_state: formData.reproductive_state || 'none',
      temperament: formData.temperament || null,
      living_climate: formData.climate || null,
      has_other_pets: formData.has_other_pets || false,
      ideal_weight_kg: formData.ideal_weight_kg || null,
      is_draft: false,
    };

    setIsSubmittingFinal(true);
    try {
      // Отправляем данные
      const created = await onSubmit(submitData, false);

      const petId = created?.data?.id || created?.data?.data?.id || created?.id;
      const healthIssueCodes = [...new Set((formData.health_issues || []).filter(code => code && code !== 'none'))];
      const allergyCodes = [...new Set((formData.excluded_ingredients || []).filter(code => code && code !== 'none'))];

      if (petId) {
        await Promise.all([
          ...healthIssueCodes.map(code => addPetHealthCondition(petId, { condition: code })),
          ...allergyCodes.map(code => addPetAllergy(petId, { allergy: code }))
        ]);
      } else {
        console.warn('Не удалось определить ID созданного питомца для сохранения M2M');
      }

      // Очищаем localStorage после успешного создания
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      // Показываем модальное окно успеха только после успешного сохранения
      setCreatedPetName(formData.name);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
      alert('Не удалось сохранить профиль. Попробуйте ещё раз.');
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  // Закрытие с подтверждением
  const handleClose = () => {
    const hasData = formData.name || formData.species;
    
    if (hasData) {
      setShowCloseConfirm(true);
    } else {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      onClose();
    }
  };
  
  // Подтверждение закрытия - сохранить черновик
  const handleConfirmSaveDraft = async () => {
    setShowCloseConfirm(false);
    await handleSaveDraft(true);
  };
  
  // Подтверждение закрытия - не сохранять
  const handleConfirmDiscard = () => {
    setShowCloseConfirm(false);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    onClose();
  };

  // Обработка закрытия модального окна успеха
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // Закрываем wizard и обновляем родительский компонент
    onClose();
  };

  // Обработка перехода к расширенному профилю
  const handleExtendProfile = () => {
    setShowSuccessModal(false);
    // Передаем сигнал родительскому компоненту открыть редактор
    onClose(true); // true означает "открыть редактор"
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary-600 to-accent-500 px-6 py-5 text-white">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2">
              🐾 {editingDraft ? 'Продолжить заполнение' : 'Новый питомец'}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              Создайте профиль за 4 простых шага
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Restored from Storage Banner */}
              <AnimatePresence>
                {restoredFromStorage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-700">
                        Восстановлены несохранённые данные
                      </span>
                    </div>
                    <button
                      onClick={handleClearRestoredData}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Очистить
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Draft Saved Success Message */}
              <AnimatePresence>
                {draftSavedMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-700">
                      Черновик сохранён! Вы можете продолжить позже.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Progress Bar */}
              <ProgressBar currentStep={currentStep} totalSteps={4} />
              
              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-3 gap-6 mt-6">
                {/* Form Area */}
                <div className="lg:col-span-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentStep === 1 && (
                        <Step1Species
                          formData={formData}
                          onChange={handleChange}
                          errors={errors}
                        />
                      )}
                      {currentStep === 2 && (
                        <Step2Info
                          formData={formData}
                          onChange={handleChange}
                          errors={errors}
                          breeds={breeds}
                          loadingBreeds={loadingBreeds}
                          onBreedSelect={handleBreedSelect}
                        />
                      )}
                      {currentStep === 3 && (
                        <Step3Health
                          formData={formData}
                          onChange={handleChange}
                          errors={errors}
                          healthOptions={healthIssueOptions}
                          allergyOptions={allergyIssueOptions}
                          isHealthOptionsLoading={loadingHealthOptions}
                          isAllergyOptionsLoading={loadingAllergyOptions}
                        />
                      )}
                      {currentStep === 4 && (
                        <Step4Behavior
                          formData={formData}
                          onChange={handleChange}
                          errors={errors}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Preview Card - Desktop */}
                <div className="hidden lg:block">
                  <PetPreviewCard 
                    formData={formData} 
                    completeness={calculateCompleteness}
                  />
                </div>
              </div>
              
              {/* Preview Card - Mobile (simplified) */}
              <div className="lg:hidden mt-6">
                <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-4 border border-primary-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {formData.species === 'dog' ? '🐕' : formData.species === 'cat' ? '🐱' : '🐾'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{formData.name || 'Имя питомца'}</p>
                        <p className="text-xs text-gray-500">{formData.breed || 'Порода'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-600">{Math.min(calculateCompleteness, 100)}%</p>
                      <p className="text-xs text-gray-400">заполнено</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
                  ${currentStep === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>

              <div className="flex items-center gap-3">
                {/* Save as draft button */}
                <button
                  type="button"
                  onClick={() => handleSaveDraft(false)}
                  disabled={isLoading || isSavingDraft || !formData.name && !formData.species}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  {isSavingDraft ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить черновик'
                  )}
                </button>

                {/* Next/Submit button */}
                <button
                  type="button"
                  onClick={currentStep === 4 ? handleSubmit : handleNext}
                  disabled={isLoading || isSubmittingFinal}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {(isLoading || isSubmittingFinal) ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Сохранение...
                    </>
                  ) : currentStep === 4 ? (
                    <>
                      Создать профиль
                      <Check className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Далее
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Close Confirmation Dialog */}
      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Сохранить черновик?
                </h3>
                <p className="text-gray-500 text-sm">
                  Вы уже начали заполнять профиль. Сохранить как черновик, чтобы продолжить позже?
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirmSaveDraft}
                  disabled={isSavingDraft}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingDraft ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить черновик'
                  )}
                </button>
                <button
                  onClick={handleConfirmDiscard}
                  className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                >
                  Не сохранять
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-all"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <SuccessModal
            petName={createdPetName}
            onClose={handleSuccessClose}
            onExtend={handleExtendProfile}
          />
        )}
      </AnimatePresence>
    </>
  );
}
