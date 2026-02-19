/**
 * CanvasArea - Main editing workspace for the course builder.
 *
 * Single-page view with module/page tree sidebar on the left.
 * DndContext is in the parent (CourseBuilder) -- this component just renders.
 */

import { useState } from 'react'
import DroppablePage from './DroppablePage'

function ModuleTree({ course, currentPageId, onPageChange, onPageAdd, onModuleAdd }) {
  const [expandedModules, setExpandedModules] = useState(() => {
    const init = {}
    course?.modules?.forEach(m => { init[m.id] = true })
    return init
  })

  const toggleModule = (id) => setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))

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
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              <span className="text-[10px] text-gray-400">{expandedModules[module.id] ? '▼' : '▶'}</span>
              <span className="truncate flex-1">{module.title}</span>
              <span className="text-[10px] text-gray-400">{(module.pages || []).length}</span>
            </button>

            {expandedModules[module.id] && (
              <div className="ml-4 space-y-px">
                {(module.pages || []).map((page) => (
                  <button
                    key={page.id}
                    onClick={() => onPageChange(page.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-[11px] rounded transition-colors ${
                      currentPageId === page.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[10px]">{pageTypeIcon(page.page_type)}</span>
                    <span className="truncate">{page.title || 'Без названия'}</span>
                  </button>
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
              <button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-[11px] rounded transition-colors ${
                  currentPageId === page.id
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-[10px]">{pageTypeIcon(page.page_type)}</span>
                <span className="truncate">{page.title || 'Без названия'}</span>
              </button>
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
        onPageChange={onPageChange}
        onPageAdd={onPageAdd}
        onPageDelete={onPageDelete}
        onModuleAdd={onModuleAdd}
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
                onPageSelect={() => {}}
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
