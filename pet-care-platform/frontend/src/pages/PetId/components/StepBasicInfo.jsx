import { useState, useEffect, useRef } from 'react';
import { Upload, Search, X, ChevronDown, Check } from 'lucide-react';
import { getBreeds } from '../../../api/pets';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";

export default function StepBasicInfo({ formData, updateFormData }) {
  const [breeds, setBreeds] = useState([]);
  const [filteredBreeds, setFilteredBreeds] = useState([]);
  const [breedSearch, setBreedSearch] = useState(formData.breed || '');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [isLoadingBreeds, setIsLoadingBreeds] = useState(false);
  const [activeBreedIndex, setActiveBreedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const listboxIdRef = useRef(`basicinfo-breed-listbox-${Math.random().toString(36).slice(2)}`);

  // Загрузка пород при изменении вида животного
  useEffect(() => {
    const loadBreeds = async () => {
      if (formData.species === 'dog' || formData.species === 'cat') {
        setIsLoadingBreeds(true);
        try {
          const response = await getBreeds({ species: formData.species });
          setBreeds(response.breeds || []);
          setFilteredBreeds(response.breeds || []);
        } catch (error) {
          console.error('Ошибка загрузки пород:', error);
          setBreeds([]);
          setFilteredBreeds([]);
        } finally {
          setIsLoadingBreeds(false);
        }
      } else {
        setBreeds([]);
        setFilteredBreeds([]);
      }
    };
    loadBreeds();
  }, [formData.species]);

  // Фильтрация пород при поиске
  useEffect(() => {
    if (breedSearch) {
      const searchLower = breedSearch.toLowerCase();
      const filtered = breeds.filter(breed => 
        breed.name.toLowerCase().includes(searchLower) ||
        (breed.name_en && breed.name_en.toLowerCase().includes(searchLower))
      );
      setFilteredBreeds(filtered);
    } else {
      setFilteredBreeds(breeds);
    }
  }, [breedSearch, breeds]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowBreedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBreedSelect = (breed) => {
    updateFormData('breed', breed.name);
    setBreedSearch(breed.name);
    setShowBreedDropdown(false);
  };

  const handleBreedInputChange = (value) => {
    setBreedSearch(value);
    updateFormData('breed', value);
    setShowBreedDropdown(true);
  };

  const clearBreed = () => {
    updateFormData('breed', '');
    setBreedSearch('');
    setShowBreedDropdown(false);
  };

  const handleSpeciesChange = (species) => {
    updateFormData('species', species);
    // Очищаем породу при смене вида
    updateFormData('breed', '');
    setBreedSearch('');
  };

  useEffect(() => {
    if (!showBreedDropdown) {
      setActiveBreedIndex(-1);
      return;
    }
    if (filteredBreeds.length === 0) {
      setActiveBreedIndex(-1);
      return;
    }
    const selectedIndex = formData.breed
      ? filteredBreeds.findIndex((breed) => breed.name === formData.breed)
      : -1;
    setActiveBreedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [showBreedDropdown, filteredBreeds, formData.breed]);

  const moveActiveIndex = (delta) => {
    if (filteredBreeds.length === 0) return;
    setActiveBreedIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return filteredBreeds.length - 1;
      if (next >= filteredBreeds.length) return 0;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-3xl font-bold mb-2">Основные данные питомца</h3>
        <p className="text-sm text-gray-500">Заполните базовую информацию о вашем питомце</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Имя */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Имя питомца *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className={INPUT_STYLE}
            placeholder="Например: Барсик"
          />
        </div>

        {/* Вид животного */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Вид животного *</label>
          <select
            value={formData.species}
            onChange={(e) => handleSpeciesChange(e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="dog">🐕 Собака</option>
            <option value="cat">🐱 Кошка</option>
            <option value="bird">🐦 Птица</option>
            <option value="other">🐾 Другое</option>
          </select>
        </div>

        {/* Порода с автодополнением */}
        <div ref={dropdownRef} className="relative">
          <label className="block text-sm text-gray-700 mb-2">
            Порода {(formData.species === 'dog' || formData.species === 'cat') && '(выберите из списка)'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={breedSearch}
              onChange={(e) => handleBreedInputChange(e.target.value)}
              onFocus={() => setShowBreedDropdown(true)}
              className={INPUT_STYLE + " pr-20"}
              placeholder={
                formData.species === 'dog' ? 'Начните вводить породу...' :
                formData.species === 'cat' ? 'Начните вводить породу...' :
                'Укажите породу'
              }
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
                  if (filteredBreeds.length > 0) setActiveBreedIndex(0);
                  return;
                }
                if (e.key === 'End') {
                  e.preventDefault();
                  if (filteredBreeds.length > 0) {
                    setActiveBreedIndex(filteredBreeds.length - 1);
                  }
                  return;
                }
                if (e.key === 'Enter' && showBreedDropdown && activeBreedIndex >= 0) {
                  e.preventDefault();
                  handleBreedSelect(filteredBreeds[activeBreedIndex]);
                  return;
                }
                if (e.key === 'Escape' && showBreedDropdown) {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowBreedDropdown(false);
                }
              }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {breedSearch && (
                <button
                  onClick={clearBreed}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              {(formData.species === 'dog' || formData.species === 'cat') && (
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showBreedDropdown ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
          
          {/* Dropdown с породами */}
          {showBreedDropdown && (formData.species === 'dog' || formData.species === 'cat') && (
            <div
              className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto"
              id={listboxIdRef.current}
              role="listbox"
            >
              {isLoadingBreeds ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Загрузка пород...
                </div>
              ) : filteredBreeds.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {breedSearch ? (
                    <>
                      <p>Порода "{breedSearch}" не найдена в базе</p>
                      <p className="text-xs mt-1">Вы можете использовать своё название</p>
                    </>
                  ) : (
                    'Введите название породы'
                  )}
                </div>
              ) : (
                <div className="py-2">
                  {filteredBreeds.map((breed, index) => (
                    <button
                      key={breed.slug}
                      onClick={() => handleBreedSelect(breed)}
                      id={`${listboxIdRef.current}-opt-${index}`}
                      role="option"
                      aria-selected={activeBreedIndex === index}
                      tabIndex={-1}
                      className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${
                        activeBreedIndex === index
                          ? 'bg-purple-100 text-purple-700'
                          : formData.breed === breed.name
                            ? 'bg-purple-50'
                            : 'hover:bg-purple-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-800">{breed.name}</div>
                        {breed.name_en && (
                          <div className="text-xs text-gray-400">{breed.name_en}</div>
                        )}
                        {breed.short_description && (
                          <div className="text-xs text-gray-500 mt-0.5">{breed.short_description}</div>
                        )}
                      </div>
                      {formData.breed === breed.name && (
                        <Check className="w-5 h-5 text-purple-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Пол */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Пол *</label>
          <select
            value={formData.gender}
            onChange={(e) => updateFormData('gender', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите пол</option>
            <option value="male">♂ Мужской</option>
            <option value="female">♀ Женский</option>
          </select>
        </div>

        {/* Дата рождения */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Дата рождения</label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => updateFormData('birthDate', e.target.value)}
            className={INPUT_STYLE}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Кастрация */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Кастрация / Стерилизация</label>
          <select
            value={formData.neutered}
            onChange={(e) => updateFormData('neutered', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите</option>
            <option value="yes">✓ Да</option>
            <option value="no">✗ Нет</option>
            <option value="planned">📅 Планируется</option>
          </select>
        </div>
      </div>

      {/* Фото */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Фотография питомца</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-purple-400 mb-2" />
          <p className="text-gray-700 text-sm mb-1">Нажмите для загрузки фото</p>
          <p className="text-gray-400 text-xs">PNG, JPG до 5MB</p>
        </div>
      </div>
    </div>
  );
}