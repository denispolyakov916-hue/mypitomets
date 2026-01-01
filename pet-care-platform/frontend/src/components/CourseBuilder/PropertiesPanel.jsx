/**
 * PropertiesPanel - Панель свойств выбранного элемента
 *
 * Отображает настройки для выбранной страницы или блока.
 * Позволяет редактировать свойства элементов.
 */

/**
 * PropertiesPanel - Панель для настройки элементов
 */
function PropertiesPanel({ selectedElement, onUpdate }) {
  /**
   * Рендеринг настроек для страницы
   */
  const renderPageProperties = (page) => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Настройки страницы
        </h3>

        <div className="space-y-4">
          {/* Название страницы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название страницы
            </label>
            <input
              type="text"
              value={page.title || ''}
              onChange={(e) => onUpdate({
                ...page,
                title: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Тип страницы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип страницы
            </label>
            <select
              value={page.page_type || ''}
              onChange={(e) => onUpdate({
                ...page,
                page_type: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">По умолчанию</option>
              <option value="text">Текстовая</option>
              <option value="video">Видео</option>
              <option value="interactive">Интерактивная</option>
              <option value="quiz">Тест</option>
              <option value="webinar">Вебинар</option>
              <option value="assignment">Задание</option>
            </select>
          </div>

          {/* Настройки страницы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Настройки
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={page.settings?.required_completion || false}
                  onChange={(e) => onUpdate({
                    ...page,
                    settings: {
                      ...page.settings,
                      required_completion: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Обязательное завершение</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={page.settings?.timer_enabled || false}
                  onChange={(e) => onUpdate({
                    ...page,
                    settings: {
                      ...page.settings,
                      timer_enabled: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Включить таймер</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={page.settings?.allow_skipping || true}
                  onChange={(e) => onUpdate({
                    ...page,
                    settings: {
                      ...page.settings,
                      allow_skipping: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Разрешить пропуск</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  /**
   * Рендеринг настроек для блока
   */
  const renderBlockProperties = (block) => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Настройки блока
        </h3>

        <div className="space-y-4">
          {/* Тип блока */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип блока
            </label>
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
              <span className="text-lg">{getBlockIcon(block.block_type)}</span>
              <span className="text-sm text-gray-900">
                {block.block_type_display || block.block_type}
              </span>
            </div>
          </div>

          {/* Специфические настройки в зависимости от типа блока */}
          {renderBlockSpecificProperties(block)}
        </div>
      </div>
    </div>
  )

  /**
   * Рендеринг специфических настроек для разных типов блоков
   */
  const renderBlockSpecificProperties = (block) => {
    const { block_type, content, settings } = block

    switch (block_type) {
      case 'rich_text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML контент
            </label>
            <textarea
              value={content?.html || ''}
              onChange={(e) => onUpdate({
                ...block,
                content: { ...content, html: e.target.value }
              })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Введите HTML контент..."
            />
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL изображения
              </label>
              <input
                type="url"
                value={content?.url || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, url: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt текст
              </label>
              <input
                type="text"
                value={content?.alt || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, alt: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Описание изображения"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подпись
              </label>
              <input
                type="text"
                value={content?.caption || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, caption: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Подпись под изображением"
              />
            </div>
          </div>
        )

      case 'video_player':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL видео
              </label>
              <input
                type="url"
                value={content?.video_url || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, video_url: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/video.mp4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название видео
              </label>
              <input
                type="text"
                value={content?.title || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, title: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Название видео"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длительность (секунды)
              </label>
              <input
                type="number"
                value={content?.duration || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, duration: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="300"
              />
            </div>

            {/* Настройки видео */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Настройки воспроизведения
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.autoplay || false}
                    onChange={(e) => onUpdate({
                      ...block,
                      settings: { ...settings, autoplay: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Автовоспроизведение</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.controls || true}
                    onChange={(e) => onUpdate({
                      ...block,
                      settings: { ...settings, controls: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Показывать контролы</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.show_subtitles || false}
                    onChange={(e) => onUpdate({
                      ...block,
                      settings: { ...settings, show_subtitles: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Показывать субтитры</span>
                </label>
              </div>
            </div>
          </div>
        )

      case 'pet_action':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип действия
              </label>
              <select
                value={content?.action_type || 'command'}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, action_type: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="command">Команда</option>
                <option value="trick">Трюк</option>
                <option value="exercise">Упражнение</option>
                <option value="health_check">Проверка здоровья</option>
                <option value="social_interaction">Социальное взаимодействие</option>
                <option value="training_session">Тренировочная сессия</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название действия
              </label>
              <input
                type="text"
                value={content?.title || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, title: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Название действия"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Инструкции
              </label>
              <textarea
                value={content?.instructions || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, instructions: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Подробные инструкции для выполнения действия"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Критерии успеха
              </label>
              <textarea
                value={content?.success_criteria || ''}
                onChange={(e) => onUpdate({
                  ...block,
                  content: { ...content, success_criteria: e.target.value }
                })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Как определить успешное выполнение"
              />
            </div>

            {/* Настройки действия */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Настройки действия
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.timer_enabled || false}
                    onChange={(e) => onUpdate({
                      ...block,
                      settings: { ...settings, timer_enabled: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Включить таймер</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.show_demonstration || true}
                    onChange={(e) => onUpdate({
                      ...block,
                      settings: { ...settings, show_demonstration: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Показывать демонстрацию</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.allow_skip || false}
                    onChange={(e) => onUpdate({
                      ...block,
                      settings: { ...settings, allow_skip: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Разрешить пропуск</span>
                </label>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Настройки для этого типа блока пока не реализованы</p>
          </div>
        )
    }
  }

  /**
   * Получение иконки для типа блока
   */
  const getBlockIcon = (blockType) => {
    const icons = {
      rich_text: '📄',
      image: '🖼️',
      gallery: '🎴',
      file_download: '📎',
      video_player: '🎥',
      audio_player: '🎵',
      embed: '🔗',
      quiz: '❓',
      poll: '📊',
      checklist: '✅',
      timer: '⏱️',
      pet_action: '🎯',
      progress_tracker: '📈',
      comment_section: '💬',
      rating: '⭐'
    }
    return icons[blockType] || '📦'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок панели */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Свойства</h3>
        {!selectedElement && (
          <p className="text-sm text-gray-600 mt-1">
            Выберите элемент для настройки
          </p>
        )}
      </div>

      {/* Содержимое панели */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedElement ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет выбранного элемента</h3>
            <p className="mt-1 text-sm text-gray-500">
              Выберите страницу или блок для настройки свойств
            </p>
          </div>
        ) : selectedElement.type === 'page' ? (
          renderPageProperties(selectedElement)
        ) : (
          renderBlockProperties(selectedElement)
        )}
      </div>
    </div>
  )
}

export default PropertiesPanel

