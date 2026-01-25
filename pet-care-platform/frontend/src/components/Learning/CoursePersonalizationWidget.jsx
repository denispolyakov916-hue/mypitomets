import React from 'react'
import { Card } from '../ui'
import { Progress } from '../ui'

/**
 * Компонент отображения персонализированной информации о курсе
 *
 * Показывает совместимость курса с питомцем, персонализированные советы,
 * уровень сложности и рекомендации.
 */
const CoursePersonalizationWidget = ({
  personalization,
  petInfo,
  className = ''
}) => {
  if (!personalization || !petInfo) {
    return null
  }

  const { compatibility, difficulty_level, estimated_time, tips, warnings } = personalization

  const getCompatibilityColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getCompatibilityIcon = (score) => {
    if (score >= 80) return '🎯'
    if (score >= 60) return '👍'
    if (score >= 40) return '🤔'
    return '⚠️'
  }

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'suitable': return 'text-green-600'
      case 'challenging': return 'text-blue-600'
      case 'difficult': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getDifficultyText = (level) => {
    switch (level) {
      case 'suitable': return 'Подходит идеально'
      case 'challenging': return 'Будет интересно'
      case 'difficult': return 'Требует усилий'
      default: return 'Неизвестно'
    }
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">🐕</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Персонализация для {petInfo.name}
          </h3>
          <p className="text-sm text-gray-600">
            Анализ совместимости курса с вашим питомцем
          </p>
        </div>
      </div>

      {/* Уровень совместимости */}
      <div className={`p-4 rounded-lg border mb-4 ${getCompatibilityColor(compatibility.score)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium flex items-center">
            <span className="mr-2">{getCompatibilityIcon(compatibility.score)}</span>
            Совместимость с {petInfo.name}
          </span>
          <span className="text-sm font-medium">
            {compatibility.score}/100
          </span>
        </div>

        <Progress value={compatibility.score} className="h-2 mb-2" />

        {compatibility.reasons && compatibility.reasons.length > 0 && (
          <div className="text-sm space-y-1">
            {compatibility.reasons.slice(0, 3).map((reason, index) => (
              <div key={index} className="flex items-start">
                <span className="text-xs mr-2 mt-0.5">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Уровень сложности */}
      {difficulty_level && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Уровень сложности:</span>
            <span className={`font-medium ${getDifficultyColor(difficulty_level)}`}>
              {getDifficultyText(difficulty_level)}
            </span>
          </div>
        </div>
      )}

      {/* Ожидаемое время */}
      {estimated_time && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Ожидаемое время прохождения:</span>
            <span className="font-medium text-gray-900">
              {estimated_time} мин
            </span>
          </div>
        </div>
      )}

      {/* Персонализированные советы */}
      {tips && tips.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <span className="mr-2">💡</span>
            Советы для успешного обучения
          </h4>
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start text-sm text-gray-700">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Предупреждения */}
      {warnings && warnings.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            Важные замечания
          </h4>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start text-sm text-amber-700">
                <span className="text-amber-500 mr-2 mt-0.5">•</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Информация о питомце */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-2">
            {petInfo.behavior_type && (
              <div>
                <span className="font-medium">Характер:</span>{' '}
                {petInfo.behavior_type === 'calm' && 'Спокойный'}
                {petInfo.behavior_type === 'active' && 'Активный'}
                {petInfo.behavior_type === 'aggressive' && 'Агрессивный'}
                {petInfo.behavior_type === 'shy' && 'Трусливый'}
              </div>
            )}
            {petInfo.activity_level && (
              <div>
                <span className="font-medium">Активность:</span>{' '}
                {petInfo.activity_level === 'low' && 'Низкая'}
                {petInfo.activity_level === 'medium' && 'Средняя'}
                {petInfo.activity_level === 'high' && 'Высокая'}
              </div>
            )}
            {petInfo.training_experience && (
              <div>
                <span className="font-medium">Опыт:</span>{' '}
                {petInfo.training_experience === 'none' && 'Без опыта'}
                {petInfo.training_experience === 'basic' && 'Базовый'}
                {petInfo.training_experience === 'intermediate' && 'Средний'}
                {petInfo.training_experience === 'advanced' && 'Продвинутый'}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default CoursePersonalizationWidget
