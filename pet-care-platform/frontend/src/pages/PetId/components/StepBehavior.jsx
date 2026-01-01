import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";
const TEXTAREA_STYLE = INPUT_STYLE + " resize-none";

const TRAITS = [
  'Дружелюбный', 'Активный', 'Спокойный', 'Игривый', 'Застенчивый', 'Любопытный', 'Независимый', 'Ласковый'
];

const BEHAVIOR_PROBLEMS = [
  'Агрессия к людям', 'Агрессия к животным', 'Страх громких звуков',
  'Разрушение вещей', 'Чрезмерный лай', 'Проблемы с туалетом',
  'Побеги', 'Жадность к еде', 'Страх одиночества', 'Другие'
];

const TRAINING_LEVELS = [
  { value: 'none', label: 'Без обучения' },
  { value: 'basic', label: 'Базовые команды (сидеть, лежать)' },
  { value: 'intermediate', label: 'Средний уровень (апорт, место)' },
  { value: 'advanced', label: 'Продвинутый уровень (спорт, работа)' },
  { value: 'professional', label: 'Профессиональный уровень' }
];

export default function StepBehavior({ formData, updateFormData, toggleArrayValue }) {
  // Инициализируем массив пользовательских черт характера, если он не существует
  const customTraits = formData.customTraits || [];
  
  const handleCustomTraitChange = (index, value) => {
    const newCustomTraits = [...customTraits];
    newCustomTraits[index] = value;
    
    // Обновляем массив пользовательских черт характера
    updateFormData('customTraits', newCustomTraits);
    
    // Обновляем массив выбранных черт характера
    const hasCustomTraits = newCustomTraits.some(trait => trait && trait.trim());
    if (hasCustomTraits && !formData.traits.includes('Другое')) {
      toggleArrayValue('traits', 'Другое');
    } else if (!hasCustomTraits && formData.traits.includes('Другое')) {
      toggleArrayValue('traits', 'Другое');
    }
    
    // Если ввели текст в последнее поле, добавляем новое пустое поле
    if (value.trim() && index === customTraits.length - 1) {
      updateFormData('customTraits', [...newCustomTraits, '']);
    }
  };

  const handleCustomTraitBlur = () => {
    // Удаляем пустые поля, кроме последнего
    const filteredTraits = customTraits.filter((trait, index) => {
      // Оставляем непустые поля
      if (trait && trait.trim()) return true;
      // Оставляем последнее пустое поле
      return index === customTraits.length - 1;
    });
    
    // Если после фильтрации не осталось ни одного поля, добавляем пустое
    const finalTraits = filteredTraits.length === 0 ? [''] : filteredTraits;
    
    updateFormData('customTraits', finalTraits);
    
    // Обновляем массив выбранных черт характера
    const hasCustomTraits = finalTraits.some(trait => trait && trait.trim());
    if (hasCustomTraits && !formData.traits.includes('Другое')) {
      toggleArrayValue('traits', 'Другое');
    } else if (!hasCustomTraits && formData.traits.includes('Другое')) {
      toggleArrayValue('traits', 'Другое');
    }
  };

  const handleCustomTraitFocus = () => {
    // При фокусе на любом поле добавляем "Другое" в выбранные
    if (!formData.traits.includes('Другое')) {
      toggleArrayValue('traits', 'Другое');
    }
  };

  // Показываем только непустые поля + одно пустое для ввода
  const visibleCustomTraits = customTraits.length === 0 ? [''] : customTraits;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-3xl font-bold mb-2">Поведение и цели</h3>
        <p className="text-sm text-gray-500">Характер питомца и задачи дрессировки</p>
      </div>

      {/* Характерные черты */}
      <div>
        <label className="block text-sm text-gray-700 mb-3">Характерные черты</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TRAITS.map((trait) => (
            <label
              key={trait}
              className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
            >
              <CustomCheckbox
                checked={formData.traits.includes(trait)}
                onChange={() => toggleArrayValue('traits', trait)}
              />
              <span className="text-sm text-gray-700">{trait}</span>
            </label>
          ))}
          
          {/* Динамические поля для пользовательских черт характера */}
          {visibleCustomTraits.map((trait, index) => (
            <div key={index} className="p-3 bg-white border-none rounded-xl transition-all">
              <input
                type="text"
                value={trait || ''}
                onChange={(e) => handleCustomTraitChange(index, e.target.value)}
                onBlur={handleCustomTraitBlur}
                onFocus={handleCustomTraitFocus}
                className={`${INPUT_STYLE} ${formData.traits.includes('Другое') && trait.trim() ? 'border-dashed border-purple-400 bg-purple-50' : ''} text-center placeholder:text-purple-300 placeholder:text-center`}
                placeholder={index === 0 ? "+ Другое" : "+ Еще черта"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Проблемы поведения */}
      <div>
        <label className="block text-sm text-gray-700 mb-3">Проблемы поведения (если есть)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BEHAVIOR_PROBLEMS.map((problem) => (
            <label
              key={problem}
              className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
            >
              <CustomCheckbox
                checked={formData.behaviorProblems.includes(problem)}
                onChange={() => toggleArrayValue('behaviorProblems', problem)}
              />
              <span className="text-sm text-gray-700">{problem}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Уровень обученности */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Уровень обученности</label>
        <select
          value={formData.trainingLevel}
          onChange={(e) => updateFormData('trainingLevel', e.target.value)}
          className={SELECT_STYLE}
        >
          <option value="">Выберите уровень</option>
          {TRAINING_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* Цели дрессировки */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Цели дрессировки</label>
        <textarea
          value={formData.goals}
          onChange={(e) => updateFormData('goals', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Опишите, каких навыков вы хотите добиться от питомца"
        />
      </div>
    </div>
  );
}