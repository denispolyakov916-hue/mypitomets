/**
 * CourseBuilder - Основной компонент конструктора курсов
 *
 * Реализует drag-and-drop интерфейс для создания курсов из блоков.
 * Состоит из трех основных областей:
 * - Панель инструментов (библиотека блоков)
 * - Рабочая область (страницы и блоки)
 * - Панель свойств (настройки выбранного элемента)
 */

import { useState, useCallback } from 'react'
import ToolboxPanel from './ToolboxPanel'
import CanvasArea from './CanvasArea'
import PropertiesPanel from './PropertiesPanel'

/**
 * CourseBuilder - Конструктор курсов
 *
 * @param {Object} course - Данные курса
 * @param {Function} onSave - Callback сохранения
 * @param {Function} onPublish - Callback публикации
 * @param {boolean} saving - Флаг сохранения
 */
function CourseBuilder({ course, onSave, onPublish, saving }) {
  const [selectedElement, setSelectedElement] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [courseData, setCourseData] = useState(course)

  // Получаем текущую страницу
  const currentPage = courseData?.pages?.find(page => page.id === currentPageId)

  /**
   * Обработка выбора элемента (страницы или блока)
   */
  const handleElementSelect = useCallback((element) => {
    setSelectedElement(element)
  }, [])

  /**
   * Обработка изменения страницы
   */
  const handlePageChange = useCallback((pageId) => {
    setCurrentPageId(pageId)
    setSelectedElement(null) // Сбрасываем выбранный элемент при смене страницы
  }, [])

  /**
   * Обработка добавления блока на страницу
   */
  const handleBlockAdd = useCallback((blockType, pageId) => {
    // TODO: Реализовать добавление блока
    console.log('Adding block:', blockType, 'to page:', pageId)
  }, [])

  /**
   * Обработка обновления блока
   */
  const handleBlockUpdate = useCallback((blockId, data) => {
    // TODO: Реализовать обновление блока
    console.log('Updating block:', blockId, 'with data:', data)
  }, [])

  /**
   * Обработка удаления блока
   */
  const handleBlockDelete = useCallback((blockId) => {
    // TODO: Реализовать удаление блока
    console.log('Deleting block:', blockId)
  }, [])

  /**
   * Обработка добавления страницы
   */
  const handlePageAdd = useCallback(() => {
    // TODO: Реализовать добавление страницы
    console.log('Adding new page')
  }, [])

  /**
   * Обработка обновления страницы
   */
  const handlePageUpdate = useCallback((pageId, data) => {
    // TODO: Реализовать обновление страницы
    console.log('Updating page:', pageId, 'with data:', data)
  }, [])

  /**
   * Обработка удаления страницы
   */
  const handlePageDelete = useCallback((pageId) => {
    // TODO: Реализовать удаление страницы
    console.log('Deleting page:', pageId)
  }, [])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Панель инструментов (библиотека блоков) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <ToolboxPanel
          course={courseData}
          currentPage={currentPage}
          onBlockAdd={handleBlockAdd}
          onTemplateUse={(template) => {
            // Обработка использования шаблона блока
            if (currentPageId) {
              handleBlockAdd(template.block_type, currentPageId, {
                content: template.content,
                settings: template.settings
              })
            }
          }}
          onPageTemplateUse={(template) => {
            // Обработка использования шаблона страницы
            console.log('Using page template:', template)
            // TODO: Реализовать применение шаблона страницы
          }}
          onImportSuccess={(importedCourse) => {
            // Обработка успешного импорта
            setCourseData(importedCourse)
            console.log('Course imported successfully:', importedCourse)
          }}
        />
      </div>

      {/* Рабочая область (страницы и блоки) */}
      <div className="flex-1 flex flex-col">
        <CanvasArea
          course={courseData}
          currentPageId={currentPageId}
          selectedElement={selectedElement}
          onElementSelect={handleElementSelect}
          onPageChange={handlePageChange}
          onPageAdd={handlePageAdd}
          onPageUpdate={handlePageUpdate}
          onPageDelete={handlePageDelete}
          onBlockUpdate={handleBlockUpdate}
          onBlockDelete={handleBlockDelete}
        />
      </div>

      {/* Панель свойств (настройки выбранного элемента) */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <PropertiesPanel
          selectedElement={selectedElement}
          onUpdate={handleElementSelect}
        />
      </div>
    </div>
  )
}

export default CourseBuilder
