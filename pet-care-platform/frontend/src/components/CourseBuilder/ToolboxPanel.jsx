/**
 * ToolboxPanel - Block library for the course builder.
 *
 * Displays available block types organized by category.
 * Blocks can be added by clicking or by dragging onto the canvas.
 * DndContext is in the parent (CourseBuilder).
 */

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'

function DraggableBlock({ blockType, icon, label, description, onClickAdd, disabled }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbox-${blockType}`,
    data: { type: 'block-template', blockType, source: 'toolbox' },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all cursor-grab
        ${isDragging
          ? 'opacity-50 shadow-lg border-blue-300 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      {...listeners}
      {...attributes}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-800 truncate">{label}</div>
        <div className="text-[10px] text-gray-400 truncate">{description}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) onClickAdd()
        }}
        disabled={disabled}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold disabled:opacity-30"
        title="Добавить на страницу"
      >+</button>
    </div>
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
                  <DraggableBlock
                    key={block.type}
                    blockType={block.type}
                    icon={block.icon}
                    label={block.label}
                    description={block.description}
                    disabled={!hasPage}
                    onClickAdd={() => onBlockAdd(block.type, currentPageId)}
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
