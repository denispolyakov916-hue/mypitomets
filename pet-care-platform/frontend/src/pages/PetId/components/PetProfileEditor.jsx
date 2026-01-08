/**
 * PetProfileEditor - Компонент редактирования профиля питомца
 * 
 * Разделён на секции: Основное, Здоровье, Питание, Поведение, Образ жизни
 * С прогресс-баром заполненности профиля
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, ChevronRight, Check, AlertTriangle,
  Heart, Utensils, Brain, Home, User, Activity, Scale
} from 'lucide-react';
import {
  ACTIVITY_LEVEL_OPTIONS, SIZE_OPTIONS, BODY_TYPE_OPTIONS,
  DIET_TYPE_OPTIONS, FEEDING_FREQUENCY_OPTIONS, HOUSING_TYPE_OPTIONS,
  DENTAL_HEALTH_OPTIONS, BEHAVIOR_TYPE_OPTIONS, SOCIAL_LEVEL_OPTIONS,
  TRAINING_EXPERIENCE_OPTIONS, CHARACTER_TRAITS, BEHAVIORAL_PROBLEMS
} from '../../../api/pets';

// Секции редактирования
const SECTIONS = [
  { id: 'basic', label: 'Основное', icon: User },
  { id: 'physical', label: 'Физические данные', icon: Scale },
  { id: 'health', label: 'Здоровье', icon: Heart },
  { id: 'nutrition', label: 'Питание', icon: Utensils },
  { id: 'behavior', label: 'Поведение', icon: Brain },
  { id: 'lifestyle', label: 'Образ жизни', icon: Home },
];

// Компонент выбора из списка
const SelectField = ({ label, value, onChange, options, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
    >
      <option value="">{placeholder || 'Не выбрано'}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Компонент текстового поля
const TextField = ({ label, value, onChange, placeholder, type = 'text', multiline }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {multiline ? (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all resize-none"
      />
    ) : (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-all"
      />
    )}
  </div>
);

// Компонент множественного выбора чипсами
const ChipSelect = ({ label, selected = [], onChange, options }) => {
  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selected.includes(option)
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

// Компонент переключателя
const ToggleField = ({ label, checked, onChange, description }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
    <div>
      <span className="font-medium text-gray-700">{label}</span>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-purple-500' : 'bg-gray-300'
      }`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
        checked ? 'translate-x-7' : 'translate-x-1'
      }`} />
    </button>
  </div>
);

export default function PetProfileEditor({ pet, onClose, onSave, isLoading }) {
  const [formData, setFormData] = useState({});
  const [activeSection, setActiveSection] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);

  // Инициализация данных формы
  useEffect(() => {
    if (pet) {
      setFormData({
        // Основное
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        date_of_birth: pet.date_of_birth || '',
        gender: pet.gender || 'unknown',
        is_neutered: pet.is_neutered || false,
        // Физические данные
        weight: pet.weight || '',
        size: pet.size || pet.calculated_size || '',
        body_type: pet.body_type || '',
        activity_level: pet.activity_level || 'medium',
        // Здоровье
        health_issues: pet.health_issues || [],
        chronic_conditions: pet.chronic_conditions || '',
        vaccinations: pet.vaccinations || '',
        medications: pet.medications || '',
        dental_health: pet.dental_health || '',
        vet_visits: pet.vet_visits || '',
        // Питание
        diet_type: pet.diet_type || '',
        feeding_frequency: pet.feeding_frequency || '',
        favorite_foods: pet.favorite_foods || [],
        allergies: pet.allergies || [],
        sensitive_digestion: pet.sensitive_digestion || false,
        excluded_ingredients: pet.excluded_ingredients || [],
        vitamins_supplements: pet.vitamins_supplements || '',
        // Поведение
        behavior_type: pet.behavior_type || '',
        social_level: pet.social_level || '',
        training_experience: pet.training_experience || '',
        character_traits: pet.character_traits || [],
        behavioral_problems: pet.behavioral_problems || [],
        training_goals: pet.training_goals || '',
        // Образ жизни
        housing_type: pet.housing_type || '',
        has_yard: pet.has_yard || false,
        other_pets: pet.other_pets || '',
        has_children: pet.has_children || false,
        walk_frequency: pet.walk_frequency || '',
        walk_duration: pet.walk_duration || '',
        // Контакты
        owner_phone: pet.owner_phone || '',
        owner_email: pet.owner_email || '',
        owner_city: pet.owner_city || '',
      });
    }
  }, [pet]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Расчёт прогресса заполнения
  const calculateProgress = () => {
    const fields = Object.values(formData);
    const filled = fields.filter(v => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'boolean') return true;
      return v && v !== '';
    }).length;
    return Math.round((filled / fields.length) * 100);
  };

  const progress = calculateProgress();

  // Рендер секций
  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-4">
            <TextField 
              label="Кличка" 
              value={formData.name} 
              onChange={(v) => handleChange('name', v)}
              placeholder="Как зовут питомца?"
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField 
                label="Порода" 
                value={formData.breed} 
                onChange={(v) => handleChange('breed', v)}
                placeholder="Например: Лабрадор"
              />
              <TextField 
                label="Дата рождения" 
                type="date"
                value={formData.date_of_birth} 
                onChange={(v) => handleChange('date_of_birth', v)}
              />
            </div>
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
            <ToggleField
              label="Кастрирован/стерилизован"
              checked={formData.is_neutered}
              onChange={(v) => handleChange('is_neutered', v)}
            />
            <div className="grid grid-cols-3 gap-4">
              <TextField 
                label="Телефон" 
                value={formData.owner_phone} 
                onChange={(v) => handleChange('owner_phone', v)}
                placeholder="+7..."
              />
              <TextField 
                label="Email" 
                type="email"
                value={formData.owner_email} 
                onChange={(v) => handleChange('owner_email', v)}
              />
              <TextField 
                label="Город" 
                value={formData.owner_city} 
                onChange={(v) => handleChange('owner_city', v)}
              />
            </div>
          </div>
        );

      case 'physical':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField 
                label="Вес (кг)" 
                type="number"
                value={formData.weight} 
                onChange={(v) => handleChange('weight', v)}
                placeholder="5.5"
              />
              <SelectField
                label="Размер"
                value={formData.size}
                onChange={(v) => handleChange('size', v)}
                options={SIZE_OPTIONS}
              />
            </div>
            <SelectField
              label="Тип телосложения"
              value={formData.body_type}
              onChange={(v) => handleChange('body_type', v)}
              options={BODY_TYPE_OPTIONS}
            />
            <SelectField
              label="Уровень активности"
              value={formData.activity_level}
              onChange={(v) => handleChange('activity_level', v)}
              options={ACTIVITY_LEVEL_OPTIONS}
            />
            
            {/* Информация о возрасте (read-only) */}
            {pet?.age !== null && (
              <div className="p-4 bg-purple-50 rounded-xl">
                <h4 className="font-medium text-purple-700 mb-2">Возраст питомца</h4>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">
                    Полных лет: <strong className="text-purple-600">{pet.age}</strong>
                  </span>
                  <span className="text-gray-600">
                    Месяцев: <strong className="text-purple-600">{pet.age_months}</strong>
                  </span>
                  <span className="text-gray-600">
                    Категория: <strong className="text-purple-600">{pet.age_category}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'health':
        return (
          <div className="space-y-4">
            <ChipSelect
              label="Проблемы здоровья"
              selected={formData.health_issues}
              onChange={(v) => handleChange('health_issues', v)}
              options={['Лишний вес', 'Чувствительное пищеварение', 'Аллергии', 'Проблемы с суставами', 'Проблемы с кожей', 'Проблемы с сердцем']}
            />
            <TextField 
              label="Хронические заболевания" 
              value={formData.chronic_conditions} 
              onChange={(v) => handleChange('chronic_conditions', v)}
              placeholder="Опишите хронические заболевания"
              multiline
            />
            <TextField 
              label="Вакцинации" 
              value={formData.vaccinations} 
              onChange={(v) => handleChange('vaccinations', v)}
              placeholder="Последние вакцинации"
            />
            <TextField 
              label="Принимаемые препараты" 
              value={formData.medications} 
              onChange={(v) => handleChange('medications', v)}
              placeholder="Текущие лекарства"
            />
            <SelectField
              label="Состояние зубов"
              value={formData.dental_health}
              onChange={(v) => handleChange('dental_health', v)}
              options={DENTAL_HEALTH_OPTIONS}
            />
            <TextField 
              label="Посещения ветеринара" 
              value={formData.vet_visits} 
              onChange={(v) => handleChange('vet_visits', v)}
              placeholder="Когда последний раз были у ветеринара?"
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
            <ChipSelect
              label="Любимые продукты"
              selected={formData.favorite_foods}
              onChange={(v) => handleChange('favorite_foods', v)}
              options={['Курица', 'Говядина', 'Рыба', 'Индейка', 'Ягненок', 'Кролик', 'Утка', 'Субпродукты']}
            />
            <ChipSelect
              label="Аллергии"
              selected={formData.allergies}
              onChange={(v) => handleChange('allergies', v)}
              options={['Курица', 'Говядина', 'Зерновые', 'Молочные', 'Яйца', 'Рыба', 'Соя']}
            />
            <ToggleField
              label="Чувствительное пищеварение"
              checked={formData.sensitive_digestion}
              onChange={(v) => handleChange('sensitive_digestion', v)}
              description="Склонность к расстройствам ЖКТ"
            />
            <TextField 
              label="Витамины и добавки" 
              value={formData.vitamins_supplements} 
              onChange={(v) => handleChange('vitamins_supplements', v)}
              placeholder="Какие добавки принимает?"
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
            <ChipSelect
              label="Черты характера"
              selected={formData.character_traits}
              onChange={(v) => handleChange('character_traits', v)}
              options={CHARACTER_TRAITS}
            />
            <ChipSelect
              label="Поведенческие проблемы"
              selected={formData.behavioral_problems}
              onChange={(v) => handleChange('behavioral_problems', v)}
              options={BEHAVIORAL_PROBLEMS}
            />
            <TextField 
              label="Цели дрессировки" 
              value={formData.training_goals} 
              onChange={(v) => handleChange('training_goals', v)}
              placeholder="Чему хотите научить питомца?"
              multiline
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
            <TextField 
              label="Другие питомцы дома" 
              value={formData.other_pets} 
              onChange={(v) => handleChange('other_pets', v)}
              placeholder="Есть ли другие животные?"
            />
            <ToggleField
              label="В доме есть дети"
              checked={formData.has_children}
              onChange={(v) => handleChange('has_children', v)}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField 
                label="Частота прогулок" 
                value={formData.walk_frequency} 
                onChange={(v) => handleChange('walk_frequency', v)}
                placeholder="Сколько раз в день?"
              />
              <TextField 
                label="Длительность прогулки" 
                value={formData.walk_duration} 
                onChange={(v) => handleChange('walk_duration', v)}
                placeholder="Сколько минут?"
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
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Редактирование профиля: {pet?.name}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-orange-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-500">{progress}% заполнено</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with sections */}
          <div className="w-56 border-r border-gray-100 p-4 space-y-1 flex-shrink-0">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{section.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Form content */}
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
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
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
          </form>
        </div>
      </motion.div>
    </div>
  );
}

