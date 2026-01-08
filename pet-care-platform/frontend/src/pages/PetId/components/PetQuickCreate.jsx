/**
 * PetQuickCreate - Компактная форма быстрого создания питомца
 * 
 * Основные поля: имя, вид, порода, дата рождения, вес
 * Автозаполнение характеристик на основе выбранной породы
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronDown, Search, Check, AlertCircle,
  Dog, Cat, Bird, Fish, Bug, HelpCircle, Sparkles
} from 'lucide-react';
import { getBreeds, getBreedSuggestions, SPECIES_OPTIONS } from '../../../api/pets';

// Иконки для видов животных
const SPECIES_ICONS = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  fish: Fish,
  rodent: Bug,
  reptile: Bug,
  other: HelpCircle,
};

// Начальное состояние формы
const initialFormState = {
  name: '',
  species: '',
  breed: '',
  breedId: null,
  date_of_birth: '',
  weight: '',
  gender: 'unknown',
  // Автозаполняемые поля (из породы)
  activity_level: 'medium',
  size: null,
};

export default function PetQuickCreate({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [breeds, setBreeds] = useState([]);
  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [selectedBreedInfo, setSelectedBreedInfo] = useState(null);
  const [loadingBreeds, setLoadingBreeds] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Загрузка пород при выборе вида
  useEffect(() => {
    if (formData.species && ['dog', 'cat'].includes(formData.species)) {
      loadBreeds(formData.species);
    } else {
      setBreeds([]);
      setFilteredBreeds([]);
    }
  }, [formData.species]);

  // Фильтрация пород по поиску
  useEffect(() => {
    if (breedSearch) {
      const filtered = breeds.filter(breed => 
        breed.name.toLowerCase().includes(breedSearch.toLowerCase())
      );
      setFilteredBreeds(filtered);
    } else {
      setFilteredBreeds(breeds);
    }
  }, [breedSearch, breeds]);

  const loadBreeds = async (species) => {
    setLoadingBreeds(true);
    try {
      const response = await getBreeds({ species, limit: 200 });
      setBreeds(response.breeds || []);
      setFilteredBreeds(response.breeds || []);
    } catch (error) {
      console.error('Ошибка загрузки пород:', error);
    } finally {
      setLoadingBreeds(false);
    }
  };

  // Загрузка подсказок при выборе породы
  const loadBreedSuggestions = async (breedId) => {
    setLoadingSuggestions(true);
    try {
      const response = await getBreedSuggestions(breedId);
      setSelectedBreedInfo(response);
      
      // Автозаполнение полей
      if (response.suggestions) {
        setFormData(prev => ({
          ...prev,
          activity_level: response.suggestions.activity_level || prev.activity_level,
          size: response.suggestions.size || prev.size,
        }));
      }
    } catch (error) {
      console.error('Ошибка загрузки подсказок:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectBreed = (breed) => {
    setFormData(prev => ({
      ...prev,
      breed: breed.name,
      breedId: breed.id,
    }));
    setBreedSearch(breed.name);
    setShowBreedDropdown(false);
    loadBreedSuggestions(breed.id);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очистка ошибки при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    // Сброс породы при смене вида
    if (field === 'species') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        breed: '', 
        breedId: null 
      }));
      setBreedSearch('');
      setSelectedBreedInfo(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Введите кличку питомца';
    }
    
    if (!formData.species) {
      newErrors.species = 'Выберите вид животного';
    }
    
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) <= 0)) {
      newErrors.weight = 'Введите корректный вес';
    }
    
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      if (dob > new Date()) {
        newErrors.date_of_birth = 'Дата рождения не может быть в будущем';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    // Формируем данные для отправки
    const submitData = {
      name: formData.name.trim(),
      species: formData.species,
      breed: formData.breed || null,
      date_of_birth: formData.date_of_birth || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      gender: formData.gender,
      activity_level: formData.activity_level,
      size: formData.size,
    };
    
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-orange-500 p-6 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">🐾 Новый питомец</h2>
          <p className="text-white/80 mt-1 text-sm">Создайте профиль вашего любимца</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Кличка питомца <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Как зовут вашего питомца?"
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.name}
              </p>
            )}
          </div>

          {/* Вид животного */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Вид животного <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SPECIES_OPTIONS.slice(0, 4).map(option => {
                const Icon = SPECIES_ICONS[option.value] || HelpCircle;
                const isSelected = formData.species === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange('species', option.value)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.species && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.species}
              </p>
            )}
          </div>

          {/* Порода (только для собак и кошек) */}
          {['dog', 'cat'].includes(formData.species) && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Порода
                {loadingSuggestions && (
                  <span className="ml-2 text-purple-500 animate-pulse">загрузка...</span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={breedSearch}
                  onChange={(e) => {
                    setBreedSearch(e.target.value);
                    setShowBreedDropdown(true);
                    if (!e.target.value) {
                      setFormData(prev => ({ ...prev, breed: '', breedId: null }));
                      setSelectedBreedInfo(null);
                    }
                  }}
                  onFocus={() => setShowBreedDropdown(true)}
                  placeholder={loadingBreeds ? 'Загрузка пород...' : 'Начните вводить название породы'}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
                {formData.breedId && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              
              {/* Dropdown со списком пород */}
              <AnimatePresence>
                {showBreedDropdown && filteredBreeds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48 overflow-y-auto"
                  >
                    {filteredBreeds.slice(0, 20).map(breed => (
                      <button
                        key={breed.id}
                        type="button"
                        onClick={() => handleSelectBreed(breed)}
                        className="w-full px-4 py-2.5 text-left hover:bg-purple-50 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-gray-700">{breed.name}</span>
                        <span className="text-xs text-gray-400">{breed.size_category}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Подсказки породы */}
              {selectedBreedInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 p-3 bg-purple-50 rounded-xl"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-purple-700 font-medium">Автозаполнено</p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        Уровень активности: {selectedBreedInfo.suggestions?.activity_level || 'средний'}, 
                        Размер: {selectedBreedInfo.suggestions?.size || 'средний'}
                      </p>
                      {selectedBreedInfo.health_warnings?.length > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Генетические риски: {selectedBreedInfo.health_warnings.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Дата рождения и Вес в ряд */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Дата рождения
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                  errors.date_of_birth ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-500'
                }`}
              />
              {errors.date_of_birth && (
                <p className="mt-1 text-xs text-red-500">{errors.date_of_birth}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Вес (кг)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="5.5"
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                  errors.weight ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-purple-500'
                }`}
              />
              {errors.weight && (
                <p className="mt-1 text-xs text-red-500">{errors.weight}</p>
              )}
            </div>
          </div>

          {/* Пол */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Пол
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'male', label: 'Мальчик', emoji: '♂️' },
                { value: 'female', label: 'Девочка', emoji: '♀️' },
                { value: 'unknown', label: 'Не указан', emoji: '❓' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('gender', option.value)}
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    formData.gender === option.value
                      ? 'border-purple-500 bg-purple-50 text-purple-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span>{option.emoji}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать питомца'
              )}
            </button>
          </div>
        </form>
      </motion.div>
      
      {/* Закрытие dropdown при клике вне */}
      {showBreedDropdown && (
        <div 
          className="fixed inset-0 -z-10"
          onClick={() => setShowBreedDropdown(false)}
        />
      )}
    </div>
  );
}

