/**
 * ToolboxPanel - Панель инструментов конструктора
 *
 * Содержит библиотеку доступных блоков контента, организованных по категориям.
 * Позволяет перетаскивать блоки в рабочую область.
 * Включает вкладки: Блоки, Шаблоны, Страницы, Аналитика, Импорт/Экспорт
 */

import { useState } from 'react'
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import {
  Blocks,
  FileText,
  Eye,
  BarChart3,
  Download,
  Settings
} from 'lucide-react'
import BlockTemplates from './Blocks/BlockTemplates'
import PageTemplates from './PageTemplates'
import BlockAnalytics from './BlockAnalytics'
import CourseImportExport from './CourseImportExport'

/**
 * DraggableBlock - Перетаскиваемый блок в панели инструментов
 */
function DraggableBlock({ blockType, icon, label, description }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbox-${blockType}`,
    data: {
      type: 'block-template',
      blockType,
      source: 'toolbox'
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-blue-300 hover:shadow-md transition-all
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{label}</div>
          <div className="text-sm text-gray-500 truncate">{description}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * BlockCategory - Категория блоков в панели инструментов
 */
function BlockCategory({ name, icon, blocks, isOpen, onToggle }) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-gray-900">{name}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {blocks.map((block) => (
            <DraggableBlock
              key={block.type}
              blockType={block.type}
              icon={block.icon}
              label={block.label}
              description={block.description}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * ToolboxPanel - Панель инструментов с библиотекой блоков
 */
function ToolboxPanel({ course, currentPage, onBlockAdd, onTemplateUse, onPageTemplateUse, onImportSuccess }) {
  const [activeTab, setActiveTab] = useState('blocks')
  const [openCategories, setOpenCategories] = useState({
    text: true,
    media: false,
    interactive: false,
    pet_specific: false,
    utility: false
  })

  /**
   * Переключение видимости категории
   */
  const toggleCategory = (category) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  /**
   * Данные блоков по категориям
   */
  const blockCategories = [
    {
      id: 'text',
      name: 'Текстовые блоки',
      icon: '📝',
      blocks: [
        {
          type: 'rich_text',
          icon: '📄',
          label: 'Форматированный текст',
          description: 'Текст с форматированием и изображениями'
        },
        {
          type: 'image',
          icon: '🖼️',
          label: 'Изображение',
          description: 'Изображение с подписью'
        },
        {
          type: 'gallery',
          icon: '🎴',
          label: 'Галерея',
          description: 'Несколько изображений'
        },
        {
          type: 'file_download',
          icon: '📎',
          label: 'Файл для скачивания',
          description: 'PDF, документы, схемы'
        }
      ]
    },
    {
      id: 'media',
      name: 'Медиа блоки',
      icon: '🎬',
      blocks: [
        {
          type: 'video_player',
          icon: '🎥',
          label: 'Видео-плеер',
          description: 'Видео с контролами воспроизведения'
        },
        {
          type: 'audio_player',
          icon: '🎵',
          label: 'Аудио-плеер',
          description: 'Аудио файл с плеером'
        },
        {
          type: 'embed',
          icon: '🔗',
          label: 'Встраиваемый контент',
          description: 'YouTube, Vimeo и другие сервисы'
        }
      ]
    },
    {
      id: 'interactive',
      name: 'Интерактивные блоки',
      icon: '🎮',
      blocks: [
        {
          type: 'quiz',
          icon: '❓',
          label: 'Тест/Викторина',
          description: 'Вопросы с вариантами ответов'
        },
        {
          type: 'poll',
          icon: '📊',
          label: 'Опрос',
          description: 'Сбор мнений и отзывов'
        },
        {
          type: 'checklist',
          icon: '✅',
          label: 'Чек-лист',
          description: 'Список задач для выполнения'
        },
        {
          type: 'timer',
          icon: '⏱️',
          label: 'Таймер',
          description: 'Таймер для упражнений'
        }
      ]
    },
    {
      id: 'pet_specific',
      name: 'Для питомцев',
      icon: '🐾',
      blocks: [
        {
          type: 'pet_action',
          icon: '🎯',
          label: 'Действие с питомцем',
          description: 'Упражнение или команда для питомца'
        }
      ]
    },
    {
      id: 'utility',
      name: 'Утилиты',
      icon: '🔧',
      blocks: [
        {
          type: 'progress_tracker',
          icon: '📈',
          label: 'Трекер прогресса',
          description: 'Отображение прогресса обучения'
        },
        {
          type: 'comment_section',
          icon: '💬',
          label: 'Комментарии',
          description: 'Секция для комментариев'
        },
        {
          type: 'rating',
          icon: '⭐',
          label: 'Оценка',
          description: 'Блок для оценки урока'
        }
      ]
    }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок панели */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Панель инструментов</h3>
        <p className="text-sm text-gray-600 mt-1">
          Перетащите блоки в рабочую область
        </p>

        {/* Вкладки */}
        <div className="flex mt-3 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === 'blocks'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Blocks size={14} />
            <span>Блоки</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === 'templates'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} />
            <span>Шаблоны</span>
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === 'pages'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings size={14} />
            <span>Страницы</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 size={14} />
            <span>Аналитика</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Download size={14} />
            <span>Импорт/Экспорт</span>
          </button>
        </div>
      </div>

      {/* Содержимое вкладок */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'blocks' && (
          <div className="h-full overflow-y-auto p-4">
            {blockCategories.map((category) => (
              <BlockCategory
                key={category.id}
                name={category.name}
                icon={category.icon}
                blocks={category.blocks}
                isOpen={openCategories[category.id]}
                onToggle={() => toggleCategory(category.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <BlockTemplates
            onTemplateUse={(template) => {
              // Используем шаблон как новый блок
              if (currentPage?.id) {
                onBlockAdd(template.block_type, currentPage.id, {
                  content: template.content,
                  settings: template.settings
                })
              }
            }}
          />
        )}

        {activeTab === 'pages' && (
          <PageTemplates
            onTemplateUse={onPageTemplateUse}
            currentPage={currentPage}
          />
        )}

        {activeTab === 'analytics' && (
          <BlockAnalytics courseId={course?.id} />
        )}

        {activeTab === 'import' && (
          <CourseImportExport
            course={course}
            onImportSuccess={onImportSuccess}
          />
        )}
      </div>

      {/* Подсказка внизу */}
      <div className="p-4 border-t border-gray-200 bg-blue-50">
        <p className="text-xs text-blue-700">
          💡 <strong>Совет:</strong> Блоки можно перетаскивать в рабочую область и настраивать в панели свойств
        </p>
      </div>
    </div>
  )
}

export default ToolboxPanel
