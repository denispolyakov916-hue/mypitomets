/**
 * CanvasArea - Main editing workspace for the course builder.
 *
 * Left sidebar: DnD-enabled module/page tree with drag handles.
 * Right area: Page canvas with block editing.
 * DndContext lives in the parent (CourseBuilder) — this component uses
 * SortableContext / useDroppable / useDndMonitor.
 */

import { useState } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable, useDndMonitor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import DroppablePage from './DroppablePage'

/* ─── Shared icons ─── */

const DragHandleIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="6" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="15" cy="18" r="1.5" />
  </svg>
)

const DeleteIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const pageTypeIcon = (type) => {
  const icons = { text: '📖', video: '▶️', quiz: '❓', interactive: '🐾', assignment: '✏️', webinar: '📡' }
  return icons[type] || '📄'
}

/* ─── Sortable Page Row ─── */

function SortablePage({ page, pageIdx, moduleId, currentPageId, onPageChange, onPageDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `structure-page-${page.id}`,
    data: { source: 'structure-page', pageId: page.id, moduleId },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-0.5 px-1 py-1 rounded transition-colors ${
        currentPageId === page.id ? 'bg-blue-100' : 'hover:bg-gray-50'
      } ${isDragging ? 'opacity-30 shadow-lg z-10 ring-2 ring-blue-400' : ''}`}
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
        <span className="text-[9px] text-gray-400 tabular-nums shrink-0 w-2.5 text-right">{pageIdx + 1}</span>
        <span className="text-[10px] shrink-0">{pageTypeIcon(page.page_type)}</span>
        <span className="truncate">{page.title || 'Без названия'}</span>
      </button>
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
          <DeleteIcon />
        </button>
      )}
    </div>
  )
}

/* ─── Sortable Module Row with droppable zone for cross-module page drops ─── */

function SortableModule({
  module, moduleIdx, currentPageId, selectedElement,
  onPageChange, onPageAdd, onPageDelete, onModuleDelete, onElementSelect,
  expandedModules, toggleModule, isPageDragging,
}) {
  const pages = module.pages || []
  const pageIds = pages.map(p => `structure-page-${p.id}`)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `structure-module-${module.id}`,
    data: { source: 'structure-module', moduleId: module.id },
  })

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: `module-drop-${module.id}`,
    data: { source: 'module-droppable', moduleId: module.id },
  })

  const showDropHighlight = isDropOver && isPageDragging

  const handleModuleClick = () => {
    onElementSelect?.({ type: 'module', id: module.id, title: module.title, description: module.description || '' })
  }

  const isSelected = selectedElement?.type === 'module' && selectedElement?.id === module.id

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-30 shadow-lg z-10 ring-2 ring-blue-400 rounded' : ''}
    >
      <div
        ref={setDropRef}
        className={`rounded transition-all ${showDropHighlight ? 'bg-blue-50 ring-1 ring-blue-300 ring-inset' : ''}`}
      >
        {/* Module header */}
        <div className={`group/module flex items-center gap-0.5 px-1 py-1.5 rounded transition-colors ${
          isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
        }`}>
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
            className={`flex-1 flex items-center gap-1.5 text-left text-xs font-medium min-w-0 ${
              isSelected ? 'text-blue-700' : 'text-gray-700'
            }`}
          >
            <span className="text-[10px] text-gray-400 tabular-nums shrink-0 w-3 text-right">{moduleIdx + 1}</span>
            <span
              className="text-[10px] text-gray-400 cursor-pointer shrink-0"
              onClick={(e) => toggleModule(e, module.id)}
            >
              {expandedModules[module.id] ? '▼' : '▶'}
            </span>
            <span className="truncate flex-1">{module.title || 'Без названия'}</span>
            <span className="text-[10px] text-gray-400">{pages.length}</span>
          </button>
          {onModuleDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Удалить модуль «' + (module.title || 'Без названия') + '» и все страницы в нём?')) {
                  onModuleDelete(module.id)
                }
              }}
              className={`shrink-0 p-0.5 text-gray-400 hover:text-red-600 rounded transition-opacity ${
                isSelected ? 'opacity-100' : 'opacity-0 group-hover/module:opacity-100'
              }`}
              title="Удалить модуль"
            >
              <DeleteIcon />
            </button>
          )}
        </div>

        {/* Pages list */}
        {expandedModules[module.id] && (
          <div className="ml-5 space-y-px">
            <SortableContext items={pageIds} strategy={verticalListSortingStrategy}>
              {pages.map((page, pageIdx) => (
                <SortablePage
                  key={page.id}
                  page={page}
                  pageIdx={pageIdx}
                  moduleId={module.id}
                  currentPageId={currentPageId}
                  onPageChange={onPageChange}
                  onPageDelete={onPageDelete}
                />
              ))}
            </SortableContext>
            {pages.length === 0 && isPageDragging && (
              <div className="px-2 py-2 text-[10px] text-gray-400 text-center border border-dashed border-gray-300 rounded">
                Перетащите сюда
              </div>
            )}
            <button
              onClick={() => onPageAdd(module.id)}
              className="w-full flex items-center gap-1 px-2 py-1 text-[11px] text-green-600 hover:bg-green-50 rounded font-medium"
            >+ Страница</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Module Tree (DnD-enabled) ─── */

function ModuleTree({ course, currentPageId, selectedElement, onPageChange, onPageAdd, onPageDelete, onModuleAdd, onModuleDelete, onElementSelect }) {
  const [expandedModules, setExpandedModules] = useState(() => {
    const init = {}
    course?.modules?.forEach(m => { init[m.id] = true })
    return init
  })
  const [activeDragSource, setActiveDragSource] = useState(null)

  useDndMonitor({
    onDragStart: (event) => setActiveDragSource(event.active.data.current?.source || null),
    onDragEnd: () => setActiveDragSource(null),
    onDragCancel: () => setActiveDragSource(null),
  })

  const toggleModule = (e, id) => {
    e.stopPropagation()
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const modules = course?.modules || []
  const orphanPages = (course?.orphan_pages || []).filter(p =>
    !modules.some(m => m.pages?.some(mp => mp.id === p.id))
  )
  const moduleIds = modules.map(m => `structure-module-${m.id}`)
  const orphanPageIds = orphanPages.map(p => `structure-page-${p.id}`)

  const isPageDragging = activeDragSource === 'structure-page'

  return (
    <div className="w-52 border-r border-gray-200 bg-white flex flex-col flex-shrink-0 h-full">
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Структура</span>
        <button
          onClick={onModuleAdd}
          className="text-[11px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
        >+ Модуль</button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        <SortableContext items={moduleIds} strategy={verticalListSortingStrategy}>
          {modules.map((module, idx) => (
            <SortableModule
              key={module.id}
              module={module}
              moduleIdx={idx}
              currentPageId={currentPageId}
              selectedElement={selectedElement}
              onPageChange={onPageChange}
              onPageAdd={onPageAdd}
              onPageDelete={onPageDelete}
              onModuleDelete={onModuleDelete}
              onElementSelect={onElementSelect}
              expandedModules={expandedModules}
              toggleModule={toggleModule}
              isPageDragging={isPageDragging}
            />
          ))}
        </SortableContext>

        {orphanPages.length > 0 && (
          <OrphanSection
            orphanPages={orphanPages}
            orphanPageIds={orphanPageIds}
            currentPageId={currentPageId}
            onPageChange={onPageChange}
            onPageDelete={onPageDelete}
            isPageDragging={isPageDragging}
          />
        )}

        {modules.length === 0 && orphanPages.length === 0 && (
          <div className="text-center py-6 px-2">
            <p className="text-[11px] text-gray-400 mb-2">Начните с создания модуля</p>
            <button
              onClick={onModuleAdd}
              className="text-[11px] text-blue-600 hover:underline font-medium"
            >+ Добавить модуль</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Orphan Pages Section (droppable for "no module" drops) ─── */

function OrphanSection({ orphanPages, orphanPageIds, currentPageId, onPageChange, onPageDelete, isPageDragging }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'module-drop-orphan',
    data: { source: 'module-droppable', moduleId: null },
  })

  const showDropHighlight = isOver && isPageDragging

  return (
    <div ref={setNodeRef} className={`rounded transition-all ${showDropHighlight ? 'bg-blue-50 ring-1 ring-blue-300 ring-inset' : ''}`}>
      <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Без модуля</div>
      <SortableContext items={orphanPageIds} strategy={verticalListSortingStrategy}>
        {orphanPages.map((page, idx) => (
          <SortablePage
            key={page.id}
            page={page}
            pageIdx={idx}
            moduleId={null}
            currentPageId={currentPageId}
            onPageChange={onPageChange}
            onPageDelete={onPageDelete}
          />
        ))}
      </SortableContext>
    </div>
  )
}

/* ─── Canvas Area ─── */

function CanvasArea({
  course,
  allPages,
  currentPageId,
  currentPage,
  sortedBlocks,
  blockIds,
  selectedElement,
  onElementSelect,
  onPageChange,
  onPageAdd,
  onPageUpdate,
  onPageDelete,
  onBlockUpdate,
  onBlockDelete,
  onModuleAdd,
  onModuleUpdate,
  onModuleDelete,
}) {
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(false)

  const handleZoomChange = (delta) => setZoom(prev => Math.max(50, Math.min(200, prev + delta)))

  const pageCount = allPages?.length || 0

  return (
    <div className="flex h-full bg-gray-50">
      <ModuleTree
        course={course}
        currentPageId={currentPageId}
        selectedElement={selectedElement}
        onPageChange={onPageChange}
        onPageAdd={onPageAdd}
        onPageDelete={onPageDelete}
        onModuleAdd={onModuleAdd}
        onModuleDelete={onModuleDelete}
        onElementSelect={onElementSelect}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-gray-600">
              {currentPage ? currentPage.title || 'Без названия' : 'Выберите страницу'}
            </h2>
            <span className="text-[10px] text-gray-400">{pageCount} стр.</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded text-blue-500 w-3 h-3" />
              Сетка
            </label>
            <div className="flex items-center gap-0.5">
              <button onClick={() => handleZoomChange(-25)} className="px-1.5 py-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded text-[11px]">-</button>
              <span className="text-[10px] text-gray-500 w-8 text-center">{zoom}%</span>
              <button onClick={() => handleZoomChange(25)} className="px-1.5 py-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded text-[11px]">+</button>
            </div>
          </div>
        </div>

        {/* Canvas content */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="mx-auto max-w-4xl"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {currentPage ? (
              <DroppablePage
                page={{ ...currentPage, blocks: sortedBlocks }}
                isSelected={true}
                selectedElement={selectedElement}
                showGrid={showGrid}
                blockIds={blockIds}
                onElementSelect={onElementSelect}
                onPageSelect={() => onElementSelect(currentPage ? { ...currentPage, type: 'page' } : null)}
                onPageUpdate={onPageUpdate}
                onBlockUpdate={onBlockUpdate}
                onBlockDelete={onBlockDelete}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center h-80">
                <div className="text-center px-6">
                  <div className="text-3xl mb-2 text-gray-300">📄</div>
                  <h3 className="text-sm font-medium text-gray-600">Выберите страницу</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Выберите страницу из дерева структуры слева или создайте новый модуль
                  </p>
                  <button
                    onClick={onModuleAdd}
                    className="mt-3 inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                  >+ Создать модуль</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasArea
