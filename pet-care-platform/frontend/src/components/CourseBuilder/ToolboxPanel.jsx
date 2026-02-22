/**
 * ToolboxPanel - Block library for the course builder.
 *
 * Blocks are added to the current page by clicking.
 * No drag from toolbox -- reordering happens only within the canvas.
 */

import { useState } from 'react'

function BlockItem({ icon, label, description, disabled, onAdd }) {
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all
        ${disabled
          ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer active:scale-[0.98]'
        }
      `}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-800 truncate">{label}</div>
        <div className="text-[10px] text-gray-400 truncate">{description}</div>
      </div>
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-blue-50 text-blue-500 text-[10px] font-bold">+</span>
    </button>
  )
}

const BLOCK_CATEGORIES = [
  {
    id: 'text',
    label: 'Текст и медиа',
    blocks: [
      { type: 'rich_text', icon: '📄', label: 'Текст', description: 'Форматированный текст' },
      { type: 'image', icon: '🖼️', label: 'Изображение', description: 'Картинка с подписью' },
      { type: 'video_player', icon: '🎥', label: 'Видео', description: 'Видео-плеер' },
      { type: 'gallery', icon: '🎴', label: 'Галерея', description: 'Несколько изображений' },
      { type: 'file_download', icon: '📎', label: 'Файл', description: 'Файл для скачивания' },
    ],
  },
  {
    id: 'interactive',
    label: 'Интерактивные',
    blocks: [
      { type: 'quiz', icon: '❓', label: 'Тест', description: 'Вопросы и ответы' },
      { type: 'checklist', icon: '✅', label: 'Чек-лист', description: 'Список задач' },
      { type: 'timer', icon: '⏱️', label: 'Таймер', description: 'Таймер для упражнений' },
      { type: 'pet_action', icon: '🐾', label: 'Упражнение', description: 'Действие с питомцем' },
    ],
  },
]

export default function ToolboxPanel({ currentPageId, onBlockAdd }) {
  const [expanded, setExpanded] = useState({ text: true, interactive: true })

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  const hasPage = !!currentPageId

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full">
      <div className="px-3 py-2.5 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Блоки</h3>
        {!hasPage && (
          <p className="text-[10px] text-amber-600 mt-1">Выберите страницу для добавления блоков</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {BLOCK_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => toggle(cat.id)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
            >
              <span>{cat.label}</span>
              <span className="text-[9px]">{expanded[cat.id] ? '▼' : '▶'}</span>
            </button>

            {expanded[cat.id] && (
              <div className="mt-1 space-y-1">
                {cat.blocks.map((block) => (
                  <BlockItem
                    key={block.type}
                    icon={block.icon}
                    label={block.label}
                    description={block.description}
                    disabled={!hasPage}
                    onAdd={() => onBlockAdd(block.type, currentPageId)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
