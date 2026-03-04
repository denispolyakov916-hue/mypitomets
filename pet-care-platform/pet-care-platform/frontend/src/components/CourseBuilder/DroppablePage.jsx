/**
 * DroppablePage - Course page with sortable blocks and 12-column grid layout.
 *
 * Accepts blocks from toolbox via useDroppable.
 * Uses SortableContext for within-page block reordering.
 * Renders blocks in a 12-column CSS Grid for alignment.
 */

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import ContentBlock from './ContentBlock'

function DroppablePage({
  page,
  isSelected,
  selectedElement,
  showGrid,
  blockIds,
  onElementSelect,
  onPageSelect,
  onPageUpdate,
  onBlockUpdate,
  onBlockDelete,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `page-${page.id}`,
    data: { type: 'page', pageId: page.id },
  })

  const blocks = page.blocks || []

  return (
    <div
      ref={setNodeRef}
      onClick={onPageSelect}
      className={`
        relative bg-white rounded-xl shadow-sm border min-h-[400px] transition-all
        ${isSelected ? 'border-blue-300' : 'border-gray-200'}
        ${isOver ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
      `}
    >
      {/* Page header */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={page.title || ''}
            onChange={(e) => onPageUpdate(page.id, { title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Название страницы"
            className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-400 rounded px-1.5 py-0.5 flex-1"
          />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {page.page_type || 'text'}
          </span>
        </div>
      </div>

      {/* 12-column grid area */}
      <div className="px-6 py-4 relative">
        {/* Grid guide lines */}
        {showGrid && (
          <div
            className="absolute inset-x-6 top-0 bottom-0 pointer-events-none z-0"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '0',
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="border-l border-dashed border-blue-100 h-full"
                style={i === 11 ? { borderRight: '1px dashed rgb(219 234 254)' } : {}}
              />
            ))}
          </div>
        )}

        {/* Sortable blocks */}
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          {blocks.length > 0 ? (
            <div
              className="relative z-10"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '12px',
              }}
            >
              {blocks.map((block) => {
                const span = block.settings?.layout?.span || 12
                const offset = block.settings?.layout?.offset || 0
                return (
                  <div
                    key={block.id}
                    style={{
                      gridColumn: offset > 0
                        ? `${offset + 1} / span ${span}`
                        : `span ${span} / span ${span}`,
                    }}
                  >
                    <ContentBlock
                      block={block}
                      isSelected={selectedElement?.id === block.id && selectedElement?.type === 'block'}
                      onSelect={() => onElementSelect({ ...block, type: 'block' })}
                      onUpdate={(data) => onBlockUpdate(block.id, data)}
                      onDelete={() => onBlockDelete(block.id)}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={`
              border-2 border-dashed rounded-lg p-10 text-center transition-colors relative z-10
              ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50/50'}
            `}>
              <div className="text-3xl mb-2 text-gray-300">📦</div>
              <h3 className="text-sm font-medium text-gray-500">Нет блоков</h3>
              <p className="text-xs text-gray-400 mt-1">
                Перетащите блоки из панели инструментов
              </p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

export default DroppablePage
