/**
 * StructureTree - Draggable module/page tree for course builder.
 *
 * Supports Drag & Drop, arrow buttons, and drag handle.
 * Uses @dnd-kit/sortable - integrates with parent DndContext.
 */

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableContext } from '@dnd-kit/sortable'

const DragHandleIcon = () => (
  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
)

const ArrowUpIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
)

const ArrowDownIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

function SortablePageRow({
  page,
  currentPageId,
  selectedElement,
  onPageChange,
  onPageDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onElementSelect,
  pageTypeIcon,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `structure-page-${page.id}`,
    data: { source: 'structure-page', sortable: true, pageId: page.id },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-0.5 px-2 py-1 rounded transition-colors ${
        currentPageId === page.id ? 'bg-blue-100' : 'hover:bg-gray-50'
      } ${isDragging ? 'opacity-50 z-10' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 rounded touch-none"
        title="Перетащить"
      >
        <DragHandleIcon />
      </button>
      <button
        onClick={() => onPageChange(page.id)}
        className={`flex-1 flex items-center gap-1.5 text-left text-[11px] min-w-0 ${
          currentPageId === page.id ? 'text-blue-700 font-medium' : 'text-gray-600'
        }`}
      >
        <span className="text-[10px] shrink-0">{pageTypeIcon(page.page_type)}</span>
        <span className="truncate">{page.title || 'Без названия'}</span>
      </button>
      <div className={`shrink-0 flex items-center gap-0.5 ${currentPageId === page.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={!canMoveUp}
          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded"
          title="Вверх"
        >
          <ArrowUpIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={!canMoveDown}
          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded"
          title="Вниз"
        >
          <ArrowDownIcon />
        </button>
      </div>
      {onPageDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm('Удалить страницу «' + (page.title || 'Без названия') + '»?')) {
              onPageDelete(page.id)
            }
          }}
          className={`shrink-0 p-0.5 text-gray-400 hover:text-red-600 rounded transition-opacity ${
            currentPageId === page.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title="Удалить страницу"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

function SortableModuleRow({
  module,
  moduleIndex,
  modulesCount,
  expandedModules,
  toggleModule,
  currentPageId,
  selectedElement,
  onPageChange,
  onPageAdd,
  onPageDelete,
  onPageReorder,
  onModuleMoveUp,
  onModuleMoveDown,
  onElementSelect,
  pageTypeIcon,
}) {
  const pages = module.pages || []
  const pageIds = pages.map(p => `structure-page-${p.id}`)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `structure-module-${module.id}`,
    data: { source: 'structure-module', sortable: true, moduleId: module.id },
  })

  const handleModuleClick = () => {
    onElementSelect?.({ type: 'module', id: module.id, title: module.title, description: module.description || '' })
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50' : ''}
    >
      <div className="group/module flex items-center gap-0.5">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 rounded touch-none"
          title="Перетащить модуль"
        >
          <DragHandleIcon />
        </button>
        <button
          onClick={handleModuleClick}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium rounded w-full ${
            selectedElement?.type === 'module' && selectedElement?.id === module.id
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span
            className="text-[10px] text-gray-400 cursor-pointer shrink-0"
            onClick={(e) => toggleModule(e, module.id)}
          >
            {expandedModules[module.id] ? '▼' : '▶'}
          </span>
          <span className="truncate flex-1">{module.title || 'Без названия'}</span>
          <span className="text-[10px] text-gray-400">{pages.length}</span>
        </button>
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/module:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onModuleMoveUp(); }}
            disabled={moduleIndex === 0}
            className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 rounded"
            title="Модуль вверх"
          >
            <ArrowUpIcon />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onModuleMoveDown(); }}
            disabled={moduleIndex >= modulesCount - 1}
            className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 rounded"
            title="Модуль вниз"
          >
            <ArrowDownIcon />
          </button>
        </div>
      </div>

      {expandedModules[module.id] && (
        <div className="ml-4 space-y-px mt-px">
          <SortableContext items={pageIds} strategy={verticalListSortingStrategy}>
            {pages.map((page, idx) => (
              <SortablePageRow
                key={page.id}
                page={page}
                currentPageId={currentPageId}
                selectedElement={selectedElement}
                onPageChange={onPageChange}
                onPageDelete={onPageDelete}
                onMoveUp={() => onPageReorder?.(module.id, page.id, -1)}
                onMoveDown={() => onPageReorder?.(module.id, page.id, 1)}
                canMoveUp={idx > 0}
                canMoveDown={idx < pages.length - 1}
                onElementSelect={onElementSelect}
                pageTypeIcon={pageTypeIcon}
              />
            ))}
          </SortableContext>
          <button
            onClick={() => onPageAdd(module.id)}
            className="w-full flex items-center gap-1 px-2 py-1 text-[11px] text-green-600 hover:bg-green-50 rounded font-medium"
          >
            + Страница
          </button>
        </div>
      )}
    </div>
  )
}

function SortableOrphanPageRow({
  page,
  index,
  total,
  currentPageId,
  onPageChange,
  onPageDelete,
  onMoveUp,
  onMoveDown,
  pageTypeIcon,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `structure-page-${page.id}`,
    data: { source: 'structure-page', sortable: true, pageId: page.id, isOrphan: true },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-0.5 px-2 py-1 rounded transition-colors ${
        currentPageId === page.id ? 'bg-blue-100' : 'hover:bg-gray-50'
      } ${isDragging ? 'opacity-50 z-10' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 rounded touch-none"
        title="Перетащить"
      >
        <DragHandleIcon />
      </button>
      <button
        onClick={() => onPageChange(page.id)}
        className={`flex-1 flex items-center gap-1.5 text-left text-[11px] min-w-0 ${
          currentPageId === page.id ? 'text-blue-700 font-medium' : 'text-gray-600'
        }`}
      >
        <span className="text-[10px] shrink-0">{pageTypeIcon(page.page_type)}</span>
        <span className="truncate">{page.title || 'Без названия'}</span>
      </button>
      <div className={`shrink-0 flex items-center gap-0.5 ${currentPageId === page.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={index === 0}
          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 rounded"
          title="Вверх"
        >
          <ArrowUpIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={index >= total - 1}
          className="p-0.5 text-gray-400 hover:text-blue-600 disabled:opacity-30 rounded"
          title="Вниз"
        >
          <ArrowDownIcon />
        </button>
      </div>
      {onPageDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm('Удалить страницу «' + (page.title || 'Без названия') + '»?')) {
              onPageDelete(page.id)
            }
          }}
          className={`shrink-0 p-0.5 text-gray-400 hover:text-red-600 rounded ${
            currentPageId === page.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title="Удалить страницу"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function StructureTree({
  course,
  currentPageId,
  selectedElement,
  onPageChange,
  onPageAdd,
  onPageDelete,
  onPageReorder,
  onModuleAdd,
  onModuleReorder,
  onElementSelect,
}) {
  const [expandedModules, setExpandedModules] = useState(() => {
    const init = {}
    course?.modules?.forEach(m => { init[m.id] = true })
    return init
  })

  const toggleModule = (e, id) => {
    e.stopPropagation()
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const pageTypeIcon = (type) => {
    const icons = { text: '📖', video: '▶️', quiz: '❓', interactive: '🐾', assignment: '✏️', webinar: '📡' }
    return icons[type] || '📄'
  }

  const modules = course?.modules || []
  const orphanPages = (course?.orphan_pages || []).filter(p =>
    !modules.some(m => m.pages?.some(mp => mp.id === p.id))
  )

  const moduleIds = modules.map(m => `structure-module-${m.id}`)
  const orphanPageIds = orphanPages.map(p => `structure-page-${p.id}`)

  const handlePageMove = (moduleId, pageId, delta) => {
    const pages = moduleId
      ? (modules.find(m => m.id === moduleId)?.pages || [])
      : orphanPages
    const idx = pages.findIndex(p => p.id === pageId)
    if (idx === -1) return
    const newIdx = Math.max(0, Math.min(pages.length - 1, idx + delta))
    if (newIdx === idx) return
    const reordered = [...pages]
    const [removed] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, removed)
    onPageReorder?.(moduleId, reordered.map(p => p.id))
  }

  const handleModuleMove = (moduleIndex, delta) => {
    const newIdx = Math.max(0, Math.min(modules.length - 1, moduleIndex + delta))
    if (newIdx === moduleIndex) return
    const reordered = [...modules]
    const [removed] = reordered.splice(moduleIndex, 1)
    reordered.splice(newIdx, 0, removed)
    onModuleReorder?.(reordered.map(m => m.id))
  }

  return (
    <div className="w-52 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 h-full">
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Структура</span>
        <button
          onClick={onModuleAdd}
          className="text-[11px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
        >
          + Модуль
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
          {modules.map((module, moduleIndex) => (
            <div key={module.id}>
              <SortableModuleRow
                module={module}
                expandedModules={expandedModules}
                toggleModule={toggleModule}
                currentPageId={currentPageId}
                selectedElement={selectedElement}
                onPageChange={onPageChange}
                onPageAdd={onPageAdd}
                onPageDelete={onPageDelete}
                onPageReorder={(modId, pageId, delta) => handlePageMove(modId, pageId, delta)}
                onModuleMoveUp={() => handleModuleMove(moduleIndex, -1)}
                onModuleMoveDown={() => handleModuleMove(moduleIndex, 1)}
                moduleIndex={moduleIndex}
                modulesCount={modules.length}
                onElementSelect={onElementSelect}
                pageTypeIcon={pageTypeIcon}
              />
            </div>
          ))}
        </SortableContext>

        {orphanPages.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Без модуля</div>
            <SortableContext items={orphanPageIds} strategy={verticalListSortingStrategy}>
              {orphanPages.map((page, idx) => (
                <SortableOrphanPageRow
                  key={page.id}
                  page={page}
                  index={idx}
                  total={orphanPages.length}
                  currentPageId={currentPageId}
                  onPageChange={onPageChange}
                  onPageDelete={onPageDelete}
                  onMoveUp={() => handlePageMove(null, page.id, -1)}
                  onMoveDown={() => handlePageMove(null, page.id, 1)}
                  pageTypeIcon={pageTypeIcon}
                />
              ))}
            </SortableContext>
          </div>
        )}

        {modules.length === 0 && orphanPages.length === 0 && (
          <div className="text-center py-6 px-2">
            <p className="text-[11px] text-gray-400 mb-2">Начните с создания модуля</p>
            <button
              onClick={onModuleAdd}
              className="text-[11px] text-blue-600 hover:underline font-medium"
            >
              + Добавить модуль
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
