/**
 * DroppablePage - Страница курса с возможностью размещения блоков
 *
 * Представляет собой страницу курса, на которую можно перетаскивать блоки.
 * Отображает заголовок страницы и сетку блоков.
 */

import { useDroppable } from '@dnd-kit/core'
import ContentBlock from './ContentBlock'

/**
 * DroppablePage - Страница для размещения блоков
 */
function DroppablePage({
  page,
  isSelected,
  selectedElement,
  onElementSelect,
  onPageSelect,
  onBlockUpdate,
  onBlockDelete
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `page-${page.id}`,
    data: {
      type: 'page',
      pageId: page.id
    }
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onPageSelect}
      className={`
        relative min-h-[400px] p-6 border-b border-gray-200 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white'}
        ${isOver ? 'bg-blue-25 border-blue-400 border-dashed' : ''}
      `}
    >
      {/* Заголовок страницы */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={page.title || ''}
            onChange={(e) => onBlockUpdate(null, {
              type: 'update_page',
              pageId: page.id,
              data: { title: e.target.value }
            })}
            onClick={(e) => e.stopPropagation()}
            placeholder={`Название страницы ${page.order_number || 1}`}
            className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          />

          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {page.page_type_display || 'Текстовая'}
          </span>
        </div>

        <p className="text-gray-600 mt-2">
          Перетащите блоки из панели инструментов на эту страницу
        </p>
      </div>

      {/* Область для блоков */}
      <div className="space-y-4">
        {page.blocks && page.blocks.length > 0 ? (
          page.blocks.map((block) => (
            <ContentBlock
              key={block.id}
              block={block}
              isSelected={selectedElement?.id === block.id && selectedElement?.type === 'block'}
              onSelect={() => onElementSelect({ ...block, type: 'block' })}
              onUpdate={(data) => onBlockUpdate(block.id, data)}
              onDelete={() => onBlockDelete(block.id)}
            />
          ))
        ) : (
          <div className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isOver ? 'border-blue-400 bg-blue-25' : 'border-gray-300 bg-gray-25'}
          `}>
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет блоков</h3>
            <p className="mt-1 text-sm text-gray-500">
              Перетащите блоки из панели инструментов
            </p>
          </div>
        )}
      </div>

      {/* Индикатор выбора страницы */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></div>
      )}
    </div>
  )
}

export default DroppablePage

