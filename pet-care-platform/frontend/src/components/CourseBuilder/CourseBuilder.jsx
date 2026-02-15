/**
 * CourseBuilder - Основной компонент конструктора курсов
 *
 * Реализует drag-and-drop интерфейс для создания курсов из блоков.
 * Состоит из трех основных областей:
 * - Панель инструментов (библиотека блоков)
 * - Рабочая область (страницы и блоки)
 * - Панель свойств (настройки выбранного элемента)
 *
 * Все обработчики подключены к реальному API.
 */

import { useState, useCallback } from 'react'
import ToolboxPanel from './ToolboxPanel'
import CanvasArea from './CanvasArea'
import PropertiesPanel from './PropertiesPanel'
import {
  createCoursePage,
  updateCoursePage,
  deleteCoursePage,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
} from '../../api/courses'
import { useToastStore } from '../../store/toastStore'

/**
 * CourseBuilder - Конструктор курсов
 *
 * @param {Object} course - Данные курса (с modules/pages/blocks)
 * @param {Function} onSave - Callback сохранения
 * @param {Function} onPublish - Callback публикации
 * @param {boolean} saving - Флаг сохранения
 */
function CourseBuilder({ course, onSave, onPublish, saving }) {
  const [selectedElement, setSelectedElement] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [courseData, setCourseData] = useState(course)
  const { success, error: showError } = useToastStore()

  // Собираем все страницы из модулей + orphan_pages
  const allPages = [
    ...(courseData?.modules?.flatMap(m => m.pages || []) || []),
    ...(courseData?.orphan_pages || []),
    ...(courseData?.pages || []),
  ]

  // Получаем текущую страницу
  const currentPage = allPages.find(page => page.id === currentPageId)

  /**
   * Обновить локальное состояние курса
   */
  const refreshCourseData = useCallback((updater) => {
    setCourseData(prev => {
      if (typeof updater === 'function') return updater(prev)
      return { ...prev, ...updater }
    })
  }, [])

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
    setSelectedElement(null)
  }, [])

  /**
   * Добавление блока на страницу через API
   */
  const handleBlockAdd = useCallback(async (blockType, pageId, templateData) => {
    const targetPageId = pageId || currentPageId
    if (!targetPageId) {
      showError('Сначала выберите или создайте страницу')
      return
    }

    try {
      const blockData = {
        block_type: blockType,
        content: templateData?.content || {},
        settings: templateData?.settings || {},
        page: targetPageId,
      }

      const result = await createContentBlock(targetPageId, blockData)

      // Добавляем блок в локальное состояние
      refreshCourseData(prev => {
        const updatePages = (pages) =>
          pages?.map(p =>
            p.id === targetPageId
              ? { ...p, blocks: [...(p.blocks || []), result] }
              : p
          )

        return {
          ...prev,
          modules: prev.modules?.map(m => ({
            ...m,
            pages: updatePages(m.pages),
          })),
          orphan_pages: updatePages(prev.orphan_pages),
          pages: updatePages(prev.pages),
        }
      })

      success('Блок добавлен')
    } catch (err) {
      console.error('Error adding block:', err)
      showError('Не удалось добавить блок')
    }
  }, [currentPageId, refreshCourseData, success, showError])

  /**
   * Обновление блока через API
   */
  const handleBlockUpdate = useCallback(async (blockId, data) => {
    try {
      const result = await updateContentBlock(blockId, data)

      refreshCourseData(prev => {
        const updateBlocks = (blocks) =>
          blocks?.map(b => b.id === blockId ? { ...b, ...result } : b)
        const updatePages = (pages) =>
          pages?.map(p => ({ ...p, blocks: updateBlocks(p.blocks) }))

        return {
          ...prev,
          modules: prev.modules?.map(m => ({
            ...m,
            pages: updatePages(m.pages),
          })),
          orphan_pages: updatePages(prev.orphan_pages),
          pages: updatePages(prev.pages),
        }
      })
    } catch (err) {
      console.error('Error updating block:', err)
      showError('Не удалось обновить блок')
    }
  }, [refreshCourseData, showError])

  /**
   * Удаление блока через API
   */
  const handleBlockDelete = useCallback(async (blockId) => {
    try {
      await deleteContentBlock(blockId)

      refreshCourseData(prev => {
        const removeBlock = (blocks) => blocks?.filter(b => b.id !== blockId)
        const updatePages = (pages) =>
          pages?.map(p => ({ ...p, blocks: removeBlock(p.blocks) }))

        return {
          ...prev,
          modules: prev.modules?.map(m => ({
            ...m,
            pages: updatePages(m.pages),
          })),
          orphan_pages: updatePages(prev.orphan_pages),
          pages: updatePages(prev.pages),
        }
      })

      success('Блок удалён')
    } catch (err) {
      console.error('Error deleting block:', err)
      showError('Не удалось удалить блок')
    }
  }, [refreshCourseData, success, showError])

  /**
   * Добавление страницы через API
   */
  const handlePageAdd = useCallback(async (moduleId = null) => {
    try {
      const pageData = {
        title: 'Новая страница',
        course_id: courseData?.id,
        module: moduleId,
      }

      const result = await createCoursePage(courseData?.id, pageData)

      refreshCourseData(prev => {
        if (moduleId) {
          return {
            ...prev,
            modules: prev.modules?.map(m =>
              m.id === moduleId
                ? { ...m, pages: [...(m.pages || []), result] }
                : m
            ),
          }
        }
        return {
          ...prev,
          orphan_pages: [...(prev.orphan_pages || []), result],
          pages: [...(prev.pages || []), result],
        }
      })

      setCurrentPageId(result.id)
      success('Страница создана')
    } catch (err) {
      console.error('Error adding page:', err)
      showError('Не удалось создать страницу')
    }
  }, [courseData?.id, refreshCourseData, success, showError])

  /**
   * Обновление страницы через API
   */
  const handlePageUpdate = useCallback(async (pageId, data) => {
    try {
      await updateCoursePage(courseData?.id, pageId, data)

      refreshCourseData(prev => {
        const updatePages = (pages) =>
          pages?.map(p => p.id === pageId ? { ...p, ...data } : p)

        return {
          ...prev,
          modules: prev.modules?.map(m => ({
            ...m,
            pages: updatePages(m.pages),
          })),
          orphan_pages: updatePages(prev.orphan_pages),
          pages: updatePages(prev.pages),
        }
      })
    } catch (err) {
      console.error('Error updating page:', err)
      showError('Не удалось обновить страницу')
    }
  }, [courseData?.id, refreshCourseData, showError])

  /**
   * Удаление страницы через API
   */
  const handlePageDelete = useCallback(async (pageId) => {
    try {
      await deleteCoursePage(courseData?.id, pageId)

      refreshCourseData(prev => {
        const removeFromPages = (pages) => pages?.filter(p => p.id !== pageId)

        return {
          ...prev,
          modules: prev.modules?.map(m => ({
            ...m,
            pages: removeFromPages(m.pages),
          })),
          orphan_pages: removeFromPages(prev.orphan_pages),
          pages: removeFromPages(prev.pages),
        }
      })

      if (currentPageId === pageId) {
        setCurrentPageId(null)
      }

      success('Страница удалена')
    } catch (err) {
      console.error('Error deleting page:', err)
      showError('Не удалось удалить страницу')
    }
  }, [courseData?.id, currentPageId, refreshCourseData, success, showError])

  /**
   * Добавление модуля через API
   */
  const handleModuleAdd = useCallback(async () => {
    try {
      const result = await createCourseModule(courseData?.id, {
        title: 'Новый модуль',
        course: courseData?.id,
      })

      refreshCourseData(prev => ({
        ...prev,
        modules: [...(prev.modules || []), { ...result, pages: [] }],
      }))

      success('Модуль создан')
    } catch (err) {
      console.error('Error adding module:', err)
      showError('Не удалось создать модуль')
    }
  }, [courseData?.id, refreshCourseData, success, showError])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Панель инструментов (библиотека блоков) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <ToolboxPanel
          course={courseData}
          currentPage={currentPage}
          onBlockAdd={handleBlockAdd}
          onTemplateUse={(template) => {
            if (currentPageId) {
              handleBlockAdd(template.block_type, currentPageId, {
                content: template.content,
                settings: template.settings,
              })
            }
          }}
          onPageTemplateUse={(template) => {
            console.log('Using page template:', template)
          }}
          onImportSuccess={(importedCourse) => {
            setCourseData(importedCourse)
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
          onModuleAdd={handleModuleAdd}
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
