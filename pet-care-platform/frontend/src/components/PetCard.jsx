/**
 * Компонент карточки питомца
 * 
 * Отображает информацию о питомце в формате карточки.
 * Используется в списке питомцев и на дашборде.
 * 
 * Props:
 *   pet: Объект питомца с id, name, species, breed и т.д.
 *   onClick: Опциональный обработчик клика
 *   showActions: Показывать кнопки редактирования/удаления (по умолчанию: false)
 *   onEdit: Обработчик кнопки редактирования
 *   onDelete: Обработчик кнопки удаления
 */

import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { PetPropTypes } from '../utils/propTypes'

/**
 * Маппинг иконок видов животных
 * Связывает код вида с эмодзи для визуальной идентификации
 */
const speciesIcons = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  rodent: '🐹',
  fish: '🐠',
  reptile: '🦎',
  other: '🐾'
}

/**
 * Маппинг названий видов животных (на русском)
 */
const speciesLabels = {
  dog: 'Собака',
  cat: 'Кошка',
  bird: 'Птица',
  rodent: 'Грызун',
  fish: 'Рыбка',
  reptile: 'Рептилия',
  other: 'Другое'
}

/**
 * Расчёт возраста питомца по дате рождения
 * @param {string} dateOfBirth - Дата в ISO формате
 * @returns {string} Возраст в человекочитаемом формате
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null
  
  const birth = new Date(dateOfBirth)
  const now = new Date()
  
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  
  if (months < 0) {
    years--
    months += 12
  }
  
  if (years > 0) {
    const yearWord = years === 1 ? 'год' : years < 5 ? 'года' : 'лет'
    return `${years} ${yearWord}`
  } else if (months > 0) {
    const monthWord = months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'
    return `${months} ${monthWord}`
  }
  
  return 'меньше месяца'
}

/**
 * Компонент PetCard
 * 
 * Отображает информацию о питомце в формате карточки:
 * - Иконка вида
 * - Кличка и порода
 * - Возраст и вес
 * - Опциональные кнопки действий
 */
function PetCard({ pet, onClick, showActions = false, onEdit, onDelete }) {
  const icon = speciesIcons[pet.species] || speciesIcons.other
  const speciesLabel = speciesLabels[pet.species] || 'Питомец'
  const age = calculateAge(pet.date_of_birth)
  
  const cardContent = (
    <div className="card hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start gap-4">
        {/* Иконка вида */}
        <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
          {icon}
        </div>
        
        {/* Информация о питомце */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {pet.name}
          </h3>
          <p className="text-sm text-gray-500">
            {speciesLabel}
            {pet.breed && ` • ${pet.breed}`}
          </p>
          
          {/* Детали */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            {age && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {age}
              </span>
            )}
            {pet.weight && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                {pet.weight} кг
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Кнопки действий */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit?.(pet)
            }}
            className="flex-1 btn-secondary text-sm py-2"
          >
            Редактировать
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete?.(pet)
            }}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  )
  
  // Если передан onClick, оборачиваем в доступный контейнер, иначе в Link
  if (onClick) {
    return (
      <div
        onClick={() => onClick(pet)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick(pet)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Открыть карточку питомца ${pet.name}`}
      >
        {cardContent}
      </div>
    )
  }
  
  return (
    <Link to={`/pets/${pet.id}`}>
      {cardContent}
    </Link>
  )
}

PetCard.propTypes = {
  pet: PetPropTypes.isRequired,
  onClick: PropTypes.func,
  showActions: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
}

export default PetCard
