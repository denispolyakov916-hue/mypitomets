/**
 * PetActionBlock - Блок действий с питомцем
 *
 * Специализированный блок для создания интерактивных упражнений,
 * команд и действий, которые пользователь должен выполнить с питомцем.
 */

import { useState } from 'react'
import {
  Target,
  Clock,
  CheckCircle,
  Camera,
  Video,
  FileText,
  Star,
  AlertTriangle,
  Info
} from 'lucide-react'

/**
 * ActionTypeSelector - Выбор типа действия
 */
function ActionTypeSelector({ value, onChange }) {
  const actionTypes = [
    { value: 'command', label: 'Команда', icon: '🎯', description: 'Обучить новой команде' },
    { value: 'trick', label: 'Трюк', icon: '🎪', description: 'Показать трюк' },
    { value: 'exercise', label: 'Упражнение', icon: '🏃', description: 'Физическое упражнение' },
    { value: 'health_check', label: 'Проверка здоровья', icon: '🏥', description: 'Мониторинг здоровья' },
    { value: 'social_interaction', label: 'Социализация', icon: '🤝', description: 'Взаимодействие с другими' },
    { value: 'training_session', label: 'Тренировка', icon: '📚', description: 'Комплексная тренировка' }
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {actionTypes.map(type => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`
            p-3 border rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors
            ${value === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
        >
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-lg">{type.icon}</span>
            <span className="font-medium text-sm">{type.label}</span>
          </div>
          <p className="text-xs text-gray-600">{type.description}</p>
        </button>
      ))}
    </div>
  )
}

/**
 * MediaUpload - Загрузка медиа файлов
 */
function MediaUpload({ onUpload, accept = "image/*,video/*" }) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        // В реальном приложении здесь была бы загрузка на сервер
        const url = URL.createObjectURL(file)
        onUpload({
          type: file.type.startsWith('image/') ? 'image' : 'video',
          url,
          name: file.name,
          size: file.size
        })
      }
    })
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
        ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="space-y-2">
        <div className="flex justify-center space-x-4">
          <Camera className="text-gray-400" size={24} />
          <Video className="text-gray-400" size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-600">
            Перетащите фото или видео сюда, или{' '}
            <label className="text-blue-600 hover:text-blue-800 cursor-pointer underline">
              выберите файл
              <input
                type="file"
                accept={accept}
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * PetActionBlock - Основной компонент блока действий с питомцем
 */
function PetActionBlock({ content, settings, onChange, mode = 'edit' }) {
  const [uploadedMedia, setUploadedMedia] = useState(content?.media || [])

  const actionType = content?.action_type || 'command'
  const title = content?.title || ''
  const instructions = content?.instructions || ''
  const successCriteria = content?.success_criteria || ''
  const tips = content?.tips || []
  const timerEnabled = settings?.timer_enabled || false
  const timerDuration = settings?.timer_duration || 60
  const demonstrationVideo = content?.demonstration_video || ''
  const difficulty = content?.difficulty || 'beginner'

  /**
   * Обновление контента
   */
  const updateContent = (field, value) => {
    onChange({
      ...content,
      [field]: value
    })
  }

  /**
   * Обновление настроек
   */
  const updateSettings = (field, value) => {
    onChange({
      ...settings,
      [field]: value
    })
  }

  /**
   * Добавление совета
   */
  const addTip = () => {
    const newTips = [...(tips || []), '']
    updateContent('tips', newTips)
  }

  /**
   * Обновление совета
   */
  const updateTip = (index, value) => {
    const newTips = [...(tips || [])]
    newTips[index] = value
    updateContent('tips', newTips)
  }

  /**
   * Удаление совета
   */
  const removeTip = (index) => {
    const newTips = [...(tips || [])]
    newTips.splice(index, 1)
    updateContent('tips', newTips)
  }

  /**
   * Загрузка медиа
   */
  const handleMediaUpload = (media) => {
    setUploadedMedia(prev => [...prev, media])
    updateContent('uploaded_media', [...uploadedMedia, media])
  }

  /**
   * Режим просмотра (для пользователя)
   */
  if (mode === 'view') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="text-blue-600" size={24} />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-medium text-blue-900">{title}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {difficulty === 'beginner' ? 'Начинающий' :
                 difficulty === 'intermediate' ? 'Средний' : 'Продвинутый'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Инструкции */}
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Инструкции:</h4>
                <p className="text-blue-800">{instructions}</p>
              </div>

              {/* Критерии успеха */}
              {successCriteria && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle className="text-green-600" size={16} />
                    <span className="font-medium text-green-900">Критерии успеха:</span>
                  </div>
                  <p className="text-green-800 text-sm">{successCriteria}</p>
                </div>
              )}

              {/* Таймер */}
              {timerEnabled && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="text-orange-600" size={16} />
                    <span className="font-medium text-orange-900">
                      Время выполнения: {Math.floor(timerDuration / 60)}:{(timerDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}

              {/* Советы */}
              {tips && tips.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Полезные советы:</h4>
                  <ul className="list-disc list-inside text-blue-800 space-y-1">
                    {tips.map((tip, index) => (
                      <li key={index} className="text-sm">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Действия пользователя */}
              <div className="flex space-x-3 pt-4">
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>Выполнено!</span>
                </button>

                <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                  Не получилось
                </button>

                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Camera size={16} />
                  <span>Загрузить фото</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Демонстрационное видео */}
        {demonstrationVideo && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Посмотрите, как это делать:</h4>
            <div className="bg-black rounded-lg h-48 flex items-center justify-center">
              <span className="text-white">🎥 Демонстрационное видео</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  /**
   * Режим редактирования (для конструктора)
   */
  return (
    <div className="space-y-6">
      {/* Заголовок и тип действия */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название действия
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => updateContent('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Например: 'Команда Сидеть'"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Сложность
          </label>
          <select
            value={difficulty}
            onChange={(e) => updateContent('difficulty', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="beginner">Начинающий</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
          </select>
        </div>
      </div>

      {/* Тип действия */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Тип действия
        </label>
        <ActionTypeSelector
          value={actionType}
          onChange={(value) => updateContent('action_type', value)}
        />
      </div>

      {/* Инструкции */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Подробные инструкции
        </label>
        <textarea
          value={instructions}
          onChange={(e) => updateContent('instructions', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Опишите пошагово, что должен сделать пользователь..."
        />
      </div>

      {/* Критерии успеха */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Критерии успешного выполнения
        </label>
        <textarea
          value={successCriteria}
          onChange={(e) => updateContent('success_criteria', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Как определить, что действие выполнено правильно..."
        />
      </div>

      {/* Советы */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Полезные советы
          </label>
          <button
            onClick={addTip}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
          >
            <span>+ Добавить совет</span>
          </button>
        </div>

        <div className="space-y-2">
          {tips && tips.map((tip, index) => (
            <div key={index} className="flex space-x-2">
              <input
                type="text"
                value={tip}
                onChange={(e) => updateTip(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Совет ${index + 1}`}
              />
              <button
                onClick={() => removeTip(index)}
                className="text-red-600 hover:text-red-800 px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Демонстрационное видео */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL демонстрационного видео (опционально)
        </label>
        <input
          type="url"
          value={demonstrationVideo}
          onChange={(e) => updateContent('demonstration_video', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>

      {/* Загрузка медиа */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Дополнительные материалы
        </label>
        <MediaUpload onUpload={handleMediaUpload} />
      </div>

      {/* Настройки действия */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Настройки действия</h4>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={timerEnabled}
              onChange={(e) => updateSettings('timer_enabled', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Включить таймер</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.show_demonstration !== false}
              onChange={(e) => updateSettings('show_demonstration', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Показывать демонстрацию</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.allow_skip || false}
              onChange={(e) => updateSettings('allow_skip', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Разрешить пропуск</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings?.require_media || false}
              onChange={(e) => updateSettings('require_media', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Требовать загрузку фото/видео</span>
          </label>
        </div>

        {/* Настройки таймера */}
        {timerEnabled && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Время на выполнение (секунды)
            </label>
            <input
              type="number"
              min="10"
              max="600"
              value={timerDuration}
              onChange={(e) => updateSettings('timer_duration', parseInt(e.target.value) || 60)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default PetActionBlock

