/**
 * CanvasArea - Main editing workspace for the course builder.
 *
 * Single-page view with module/page tree sidebar on the left.
 * DndContext is in the parent (CourseBuilder) -- this component just renders.
 */

import { useState } from 'react'
import DroppablePage from './DroppablePage'

function ModuleTree({ course, currentPageId, selectedElement, onPageChange, onPageAdd, onPageDelete, onModuleAdd, onModuleDelete, onElementSelect }) {
  const [expandedModules, setExpandedModules] = useState(() => {
    const init = {}
    course?.modules?.forEach(m => { init[m.id] = true })
    return init
  })

  const toggleModule = (e, id) => {
    e.stopPropagation()
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleModuleClick = (module) => {
    onElementSelect?.({ type: 'module', id: module.id, title: module.title, description: module.description || '' })
  }

  const pageTypeIcon = (type) => {
    const icons = { text: '📖', video: '▶️', quiz: '❓', interactive: '🐾', assignment: '✏️', webinar: '📡' }
    return icons[type] || '📄'
  }

  const modules = course?.modules || []
  const orphanPages = (course?.orphan_pages || []).filter(p =>
    !modules.some(m => m.pages?.some(mp => mp.id === p.id))
  )

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
        {modules.map((module) => (
          <div key={module.id}>
            <div
              className={`group/module flex items-center gap-1.5 px-2 py-1.5 rounded ${
                selectedElement?.type === 'module' && selectedElement?.id === module.id
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => handleModuleClick(module)}
                className={`flex-1 flex items-center gap-1.5 text-left text-xs font-medium min-w-0 ${
                  selectedElement?.type === 'module' && selectedElement?.id === module.id
                    ? 'text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                <span
                  className="text-[10px] text-gray-400 cursor-pointer shrink-0"
                  onClick={(e) => toggleModule(e, module.id)}
                >
                  {expandedModules[module.id] ? '▼' : '▶'}
                </span>
                <span className="truncate flex-1">{module.title || 'Без названия'}</span>
                <span className="text-[10px] text-gray-400">{(module.pages || []).length}</span>
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
                    selectedElement?.type === 'module' && selectedElement?.id === module.id ? 'opacity-100' : 'opacity-0 group-hover/module:opacity-100'
                  }`}
                  title="Удалить модуль"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {expandedModules[module.id] && (
              <div className="ml-4 space-y-px">
                {(module.pages || []).map((page) => (
                  <div
                    key={page.id}
                    className={`group flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                      currentPageId === page.id ? 'bg-blue-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => onPageChange(page.id)}
                      className={`flex-1 flex items-center gap-1.5 text-left text-[11px] min-w-0 ${
                        currentPageId === page.id ? 'text-blue-700 font-medium' : 'text-gray-600'
                      }`}
                    >
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
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => onPageAdd(module.id)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-[11px] text-green-600 hover:bg-green-50 rounded font-medium"
                >+ Страница</button>
              </div>
            )}
          </div>
        ))}

        {orphanPages.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Без модуля</div>
            {orphanPages.map((page) => (
              <div
                key={page.id}
                className={`group flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  currentPageId === page.id ? 'bg-blue-100' : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => onPageChange(page.id)}
                  className={`flex-1 flex items-center gap-1.5 text-left text-[11px] min-w-0 ${
                    currentPageId === page.id ? 'text-blue-700 font-medium' : 'text-gray-600'
                  }`}
                >
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
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
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
