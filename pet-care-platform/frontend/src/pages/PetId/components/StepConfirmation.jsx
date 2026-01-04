import { CheckCircle } from 'lucide-react';

const formatValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Не указано';
  }
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }
  return value || 'Не указано';
};

const formatSize = (size) => {
  const sizes = {
    mini: 'Миниатюрный (до 5 кг)',
    small: 'Маленький (5-10 кг)',
    medium: 'Средний (10-25 кг)',
    large: 'Крупный (25-40 кг)',
    giant: 'Гигантский (свыше 40 кг)'
  };
  return sizes[size] || size;
};

const formatBodyType = (bodyType) => {
  const types = {
    slim: 'Худощавый',
    normal: 'Нормальный',
    overweight: 'Избыточный вес',
    obese: 'Ожирение'
  };
  return types[bodyType] || bodyType;
};

const formatActivityLevel = (level) => {
  const levels = {
    low: 'Низкий (домашний питомец)',
    moderate: 'Средний (регулярные прогулки)',
    high: 'Высокий (активный образ жизни)',
    very_high: 'Очень высокий (спорт, охота)'
  };
  return levels[level] || level;
};

const formatTrainingLevel = (level) => {
  const levels = {
    none: 'Без обучения',
    basic: 'Базовые команды',
    intermediate: 'Средний уровень',
    advanced: 'Продвинутый уровень',
    professional: 'Профессиональный уровень'
  };
  return levels[level] || level;
};

const formatDentalHealth = (health) => {
  const healthStates = {
    excellent: 'Отличное состояние',
    good: 'Хорошее состояние',
    fair: 'Удовлетворительное',
    poor: 'Плохое состояние',
    needs_attention: 'Требует внимания'
  };
  return healthStates[health] || health;
};

const formatHousingType = (type) => {
  const types = {
    apartment: 'Квартира',
    house: 'Частный дом',
    cottage: 'Дача/Коттедж',
    other: 'Другое'
  };
  return types[type] || type;
};

export default function StepConfirmation({ formData, progress }) {
  const sections = [
    {
      title: 'Основные данные',
      icon: '🐾',
      fields: [
        { label: 'Имя', value: formData.name },
        { label: 'Вид', value: formData.species === 'dog' ? 'Собака' : formData.species === 'cat' ? 'Кошка' : formData.species },
        { label: 'Порода', value: formData.breed },
        { label: 'Пол', value: formData.gender === 'male' ? 'Мужской' : formData.gender === 'female' ? 'Женский' : formData.gender },
        { label: 'Дата рождения', value: formData.birthDate },
        { label: 'Кастрация', value: formatValue(formData.neutered === 'yes' ? true : formData.neutered === 'no' ? false : formData.neutered) }
      ]
    },
    {
      title: 'Контакты',
      icon: '📞',
      fields: [
        { label: 'Телефон', value: formData.phone },
        { label: 'Email', value: formData.email },
        { label: 'Город', value: formData.city }
      ]
    },
    {
      title: 'Физические параметры',
      icon: '⚖️',
      fields: [
        { label: 'Текущий вес', value: formData.currentWeight ? `${formData.currentWeight} кг` : null },
        { label: 'Идеальный вес', value: formData.idealWeight ? `${formData.idealWeight} кг` : null },
        { label: 'Размер', value: formatSize(formData.size) },
        { label: 'Тип телосложения', value: formatBodyType(formData.bodyType) },
        { label: 'Уровень активности', value: formatActivityLevel(formData.activityLevel) }
      ]
    },
    {
      title: 'Питание',
      icon: '🍖',
      fields: [
        { label: 'Тип питания', value: formData.dietType },
        { label: 'Частота кормлений', value: formData.feedingFrequency },
        { label: 'Любимые вкусы', value: formatValue(formData.favoriteFlavors) },
        { label: 'Аллергии', value: formData.allergies },
        { label: 'Чувствительное пищеварение', value: formatValue(formData.sensitiveBelly) }
      ]
    },
    {
      title: 'Поведение',
      icon: '🧠',
      fields: [
        { label: 'Черты характера', value: formatValue(formData.traits) },
        { label: 'Проблемы поведения', value: formatValue(formData.behaviorProblems) },
        { label: 'Уровень обученности', value: formatTrainingLevel(formData.trainingLevel) },
        { label: 'Цели дрессировки', value: formData.goals }
      ]
    },
    {
      title: 'Здоровье',
      icon: '🏥',
      fields: [
        { label: 'Хронические заболевания', value: formData.chronicConditions },
        { label: 'Вакцинации', value: formData.vaccinations },
        { label: 'Медикаменты', value: formData.medications },
        { label: 'Здоровье зубов', value: formatDentalHealth(formData.dentalHealth) }
      ]
    },
    {
      title: 'Образ жизни',
      icon: '🏠',
      fields: [
        { label: 'Тип жилья', value: formatHousingType(formData.housingType) },
        { label: 'Наличие двора', value: formatValue(formData.hasYard) },
        { label: 'Другие питомцы', value: formData.otherPets },
        { label: 'Наличие детей', value: formatValue(formData.hasChildren) },
        { label: 'Частота прогулок', value: formData.walkFrequency },
        { label: 'Длительность прогулки', value: formData.walkDuration }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-lg font-medium mb-2">Подтверждение данных</h3>
        <p className="text-sm text-gray-500 mb-4">Проверьте введенную информацию перед сохранением</p>

        {/* Прогресс-бар */}
        <div className="bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 text-center">{progress}% заполнено</p>
      </div>

      {/* Секции с данными */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{section.icon}</span>
              <h4 className="text-md font-medium text-gray-800">{section.title}</h4>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {section.fields.map((field, fieldIndex) => (
                <div key={fieldIndex} className="flex justify-between items-start">
                  <span className="text-sm text-gray-600 min-w-0 flex-1 mr-2">{field.label}:</span>
                  <span className="text-sm text-gray-800 font-medium text-right flex-1">
                    {formatValue(field.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Сообщение о готовности */}
      <div className="bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h4 className="text-md font-medium text-gray-800">Готово к сохранению!</h4>
            <p className="text-sm text-gray-600">Вы можете отредактировать любую информацию позже в профиле питомца</p>
          </div>
        </div>
      </div>
    </div>
  );
}








