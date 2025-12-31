/**
 * CanvasArea - Рабочая область конструктора
 *
 * Отображает страницы курса и позволяет размещать блоки на них.
 * Поддерживает drag-and-drop для блоков.
 */

import { useState } from 'react'
import { DndContext, useDroppable } from '@dnd-kit/core'
import PageNavigation from './PageNavigation'
import DroppablePage from './DroppablePage'

/**
 * CanvasArea - Рабочая область с страницами
 */
function CanvasArea({
  course,
  currentPageId,
  selectedElement,
  onElementSelect,
  onPageChange,
  onPageAdd,
  onPageUpdate,
  onPageDelete,
  onBlockUpdate,
  onBlockDelete
}) {
  const [zoom, setZoom] = useState(100)

  /**
   * Обработка drag-and-drop событий
   */
  const handleDragEnd = (event) => {
    const { active, over } = event

    if (!over) return

    const draggedItem = active.data.current
    const dropTarget = over.data.current

    // Если перетаскиваем блок из панели инструментов
    if (draggedItem?.source === 'toolbox' && dropTarget?.type === 'page') {
      // Добавляем новый блок на страницу
      onBlockUpdate(null, {
        type: 'add',
        blockType: draggedItem.blockType,
        pageId: dropTarget.pageId
      })
    }

    // Если перетаскиваем существующий блок
    if (draggedItem?.type === 'block' && dropTarget?.type === 'page') {
      // Перемещаем блок на другую страницу
      if (draggedItem.pageId !== dropTarget.pageId) {
        onBlockUpdate(draggedItem.id, {
          type: 'move',
          newPageId: dropTarget.pageId
        })
      }
    }
  }

  /**
   * Изменение масштаба
   */
  const handleZoomChange = (newZoom) => {
    setZoom(Math.max(50, Math.min(200, newZoom)))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Панель управления рабочей областью */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Рабочая область
          </h2>
          <div className="text-sm text-gray-600">
            {course?.pages?.length || 0} страниц
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Управление масштабом */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleZoomChange(zoom - 25)}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Уменьшить"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {zoom}%
            </span>

            <button
              onClick={() => handleZoomChange(zoom + 25)}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Увеличить"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Навигация по страницам */}
      <PageNavigation
        pages={course?.pages || []}
        currentPageId={currentPageId}
        onPageChange={onPageChange}
        onPageAdd={onPageAdd}
        onPageDelete={onPageDelete}
      />

      {/* Рабочая область с drag-and-drop */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext onDragEnd={handleDragEnd}>
          <div
            className="mx-auto bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px]"
            style={{
              width: `${zoom}%`,
              maxWidth: 'none',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center'
            }}
          >
            {course?.pages && course.pages.length > 0 ? (
              course.pages.map((page) => (
                <DroppablePage
                  key={page.id}
                  page={page}
                  isSelected={currentPageId === page.id}
                  selectedElement={selectedElement}
                  onElementSelect={onElementSelect}
                  onPageSelect={() => onPageChange(page.id)}
                  onBlockUpdate={onBlockUpdate}
                  onBlockDelete={onBlockDelete}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Нет страниц</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Добавьте первую страницу курса
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={onPageAdd}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Добавить страницу
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DndContext>
      </div>
    </div>
  )
}

export default CanvasArea

