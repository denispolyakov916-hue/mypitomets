/**
 * CoursePreview - Предпросмотр курса
 *
 * Позволяет просматривать курс на разных устройствах
 * и в разных режимах отображения.
 */

import { useState, useEffect } from 'react'
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff
} from 'lucide-react'

/**
 * DeviceFrame - Рамка устройства для предпросмотра
 */
function DeviceFrame({ device, children, scale = 1 }) {
  const devices = {
    mobile: {
      name: 'Мобильный',
      width: 375,
      height: 667,
      icon: Smartphone,
      className: 'rounded-2xl border-4 border-gray-800'
    },
    tablet: {
      name: 'Планшет',
      width: 768,
      height: 1024,
      icon: Tablet,
      className: 'rounded-2xl border-4 border-gray-800'
    },
    desktop: {
      name: 'Десктоп',
      width: 1200,
      height: 800,
      icon: Monitor,
      className: 'rounded-lg border-2 border-gray-400'
    }
  }

  const deviceConfig = devices[device] || devices.desktop
  const IconComponent = deviceConfig.icon

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Название устройства */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <IconComponent size={16} />
        <span>{deviceConfig.name}</span>
        <span className="text-gray-400">
          {deviceConfig.width} × {deviceConfig.height}
        </span>
      </div>

      {/* Рамка устройства */}
      <div
        className={`bg-white overflow-hidden shadow-lg ${deviceConfig.className}`}
        style={{
          width: deviceConfig.width * scale,
          height: deviceConfig.height * scale,
          maxWidth: '100%',
          maxHeight: '70vh'
        }}
      >
        <div
          className="w-full h-full overflow-auto bg-gray-50"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * CoursePreview - Основной компонент предпросмотра
 */
function CoursePreview({ course, isOpen, onClose }) {
  const [selectedDevice, setSelectedDevice] = useState('desktop')
  const [scale, setScale] = useState(1)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [showNavigation, setShowNavigation] = useState(true)

  const pages = course?.pages || []
  const currentPage = pages[currentPageIndex]

  // Сброс состояния при открытии
  useEffect(() => {
    if (isOpen) {
      setSelectedDevice('desktop')
      setScale(1)
      setCurrentPageIndex(0)
      setShowNavigation(true)
    }
  }, [isOpen])

  // Автоматическая настройка масштаба для мобильных устройств
  useEffect(() => {
    if (selectedDevice === 'mobile') {
      setScale(0.8)
    } else if (selectedDevice === 'tablet') {
      setScale(0.6)
    } else {
      setScale(1)
    }
  }, [selectedDevice])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Предпросмотр: {course?.title}
            </h2>
            <p className="text-sm text-gray-600">
              Как курс будет выглядеть для пользователей
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Панель управления */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Выбор устройства */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Устройство:</span>
              <div className="flex space-x-1">
                {[
                  { key: 'desktop', icon: Monitor, label: 'ПК' },
                  { key: 'tablet', icon: Tablet, label: 'Планшет' },
                  { key: 'mobile', icon: Smartphone, label: 'Телефон' }
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDevice(key)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm ${
                      selectedDevice === key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Масштаб */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Масштаб:</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Уменьшить"
                >
                  <ZoomOut size={16} />
                </button>

                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(scale * 100)}%
                </span>

                <button
                  onClick={() => setScale(Math.min(2, scale + 0.1))}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Увеличить"
                >
                  <ZoomIn size={16} />
                </button>

                <button
                  onClick={() => {
                    if (selectedDevice === 'mobile') setScale(0.8)
                    else if (selectedDevice === 'tablet') setScale(0.6)
                    else setScale(1)
                  }}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded ml-2"
                  title="Сбросить масштаб"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Навигация */}
            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm ${
                showNavigation
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {showNavigation ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>Навигация</span>
            </button>

            {/* Навигация по страницам */}
            {pages.length > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  ←
                </button>

                <span className="text-sm text-gray-600 min-w-[4rem] text-center">
                  {currentPageIndex + 1} / {pages.length}
                </span>

                <button
                  onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                  disabled={currentPageIndex === pages.length - 1}
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Область предпросмотра */}
        <div className="flex-1 overflow-hidden">
          <DeviceFrame device={selectedDevice} scale={scale}>
            <div className="min-h-full bg-white">
              {/* Имитация навигации курса */}
              {showNavigation && (
                <div className="bg-blue-600 text-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">{course?.title}</h1>
                    <div className="flex items-center space-x-4 text-sm">
                      <span>Прогресс: 0%</span>
                      <span>{pages.length} уроков</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Содержимое страницы */}
              <div className="p-4">
                {currentPage ? (
                  <div className="max-w-4xl mx-auto">
                    {/* Заголовок страницы */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {currentPage.title || `Страница ${currentPage.order_number}`}
                      </h2>
                      {currentPage.page_type_display && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                          {currentPage.page_type_display}
                        </span>
                      )}
                    </div>

                    {/* Блоки контента */}
                    <div className="space-y-6">
                      {currentPage.blocks && currentPage.blocks.length > 0 ? (
                        currentPage.blocks.map((block) => (
                          <div key={block.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-2">
                              {block.block_type_display || block.block_type}
                            </div>

                            {/* Простая имитация содержимого блока */}
                            {block.block_type === 'rich_text' && (
                              <div className="prose prose-sm max-w-none">
                                <div dangerouslySetInnerHTML={{
                                  __html: block.content?.html || '<p>Пример текста с <strong>форматированием</strong></p>'
                                }} />
                              </div>
                            )}

                            {block.block_type === 'image' && (
                              <div className="text-center">
                                {block.content?.url ? (
                                  <img
                                    src={block.content.url}
                                    alt={block.content.alt || ''}
                                    className="max-w-full h-auto rounded-lg mx-auto"
                                  />
                                ) : (
                                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <span className="text-gray-500">Изображение</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {block.block_type === 'video_player' && (
                              <div className="text-center">
                                <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                                  <span className="text-white">🎥 Видео</span>
                                </div>
                              </div>
                            )}

                            {block.block_type === 'quiz' && (
                              <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">Тест</h4>
                                <p className="text-sm text-gray-600">
                                  {block.content?.questions?.length || 0} вопросов
                                </p>
                              </div>
                            )}

                            {block.block_type === 'pet_action' && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900">
                                  {block.content?.title || 'Действие с питомцем'}
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">
                                  {block.content?.instructions || 'Инструкции'}
                                </p>
                              </div>
                            )}

                            {/* Для остальных типов блоков */}
                            {!['rich_text', 'image', 'video_player', 'quiz', 'pet_action'].includes(block.block_type) && (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-3xl mb-2">📦</div>
                                <p>{block.block_type_display || block.block_type}</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <div className="text-4xl mb-4">📄</div>
                          <p>На этой странице пока нет блоков</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📚</div>
                      <p>Выберите страницу для предпросмотра</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DeviceFrame>
        </div>
      </div>
    </div>
  )
}

export default CoursePreview

