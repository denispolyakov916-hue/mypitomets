import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";
const TEXTAREA_STYLE = INPUT_STYLE + " resize-none";

const TRAITS = [
  'Игривый', 'Дружелюбный', 'Энергичный', 'Спокойный',
  'Умный', 'Послушный', 'Любопытный', 'Застенчивый',
  'Агрессивный', 'Ленивый', 'Общительный', 'Самостоятельный'
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
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-lg font-medium mb-2">Поведение и дрессировка</h3>
        <p className="text-sm text-gray-500">Опишите характер и уровень обученности питомца</p>
      </div>

      {/* Черты характера */}
      <div>
        <label className="block text-sm text-gray-700 mb-3">Черты характера</label>
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


