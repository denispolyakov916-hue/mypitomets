/**
 * CourseBuilder - Main course constructor component.
 *
 * 3-panel layout: Toolbox (left) | Canvas (center) | Properties (right)
 * DndContext wraps all three panels so toolbox draggables can drop onto canvas.
 */

import { useState, useCallback, useMemo } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import ToolboxPanel from './ToolboxPanel'
import CanvasArea from './CanvasArea'
import PropertiesPanel from './PropertiesPanel'
import {
  createCoursePage,
  updateCoursePage,
  deleteCoursePage,
  deleteCourseModule,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  createCourseModule,
  updateCourseModule,
} from '../../api/courses'
import { useToastStore } from '../../store/toastStore'

function CourseBuilder({ course, onSave, onPublish, saving }) {
  const [selectedElement, setSelectedElement] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [courseData, setCourseData] = useState(course)
  const { success, error: showError } = useToastStore()

  const allPages = useMemo(() => {
    const pages = []
    const seen = new Set()
    const addPage = (p) => { if (p && !seen.has(p.id)) { seen.add(p.id); pages.push(p) } }
    courseData?.modules?.forEach(m => (m.pages || []).forEach(addPage))
    ;(courseData?.orphan_pages || []).forEach(addPage)
    ;(courseData?.pages || []).forEach(addPage)
    return pages
  }, [courseData])

  const currentPage = useMemo(
    () => allPages.find(p => p.id === currentPageId),
    [allPages, currentPageId]
  )

  const sortedBlocks = useMemo(() => {
    if (!currentPage?.blocks) return []
    return [...currentPage.blocks].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [currentPage?.blocks])

  const blockIds = useMemo(() => sortedBlocks.map(b => `block-${b.id}`), [sortedBlocks])

  const refreshCourseData = useCallback((updater) => {
    setCourseData(prev => typeof updater === 'function' ? updater(prev) : { ...prev, ...updater })
  }, [])

  const updatePagesInState = useCallback((updater) => {
    refreshCourseData(prev => ({
      ...prev,
      modules: prev.modules?.map(m => ({ ...m, pages: updater(m.pages) })),
      orphan_pages: updater(prev.orphan_pages),
      pages: updater(prev.pages),
    }))
  }, [refreshCourseData])

  const handleElementSelect = useCallback((element) => setSelectedElement(element), [])
  const handlePageChange = useCallback((pageId) => {
    setCurrentPageId(pageId)
    const page = allPages.find(p => p.id === pageId)
    setSelectedElement(page ? { ...page, type: 'page' } : null)
  }, [allPages])

  /* ─── Block CRUD ─── */
  const handleBlockAdd = useCallback(async (blockType, pageId, templateData) => {
    const targetPageId = pageId || currentPageId
    if (!targetPageId) { showError('Сначала выберите или создайте страницу'); return }
    try {
      const blockData = {
        block_type: blockType,
        content: templateData?.content || {},
        settings: templateData?.settings || {},
        page: targetPageId,
      }
      const result = await createContentBlock(targetPageId, blockData)
      updatePagesInState(pages =>
        pages?.map(p => p.id === targetPageId
          ? { ...p, blocks: [...(p.blocks || []), result] }
          : p
        )
      )
      success('Блок добавлен')
    } catch (err) {
      console.error('Error adding block:', err)
      showError('Не удалось добавить блок')
    }
  }, [currentPageId, updatePagesInState, success, showError])

  const handleBlockUpdate = useCallback(async (blockId, data) => {
    if (!blockId) return
    try {
      await updateContentBlock(blockId, data)
      updatePagesInState(pages =>
        pages?.map(p => ({
          ...p,
          blocks: p.blocks?.map(b => b.id === blockId ? { ...b, ...data } : b),
        }))
      )
    } catch (err) {
      console.error('Error updating block:', err)
      showError('Не удалось обновить блок')
    }
  }, [updatePagesInState, showError])

  const handleBlockDelete = useCallback(async (blockId) => {
    try {
      await deleteContentBlock(blockId)
      updatePagesInState(pages =>
        pages?.map(p => ({ ...p, blocks: p.blocks?.filter(b => b.id !== blockId) }))
      )
      if (selectedElement?.id === blockId) setSelectedElement(null)
      success('Блок удалён')
    } catch (err) {
      console.error('Error deleting block:', err)
      showError('Не удалось удалить блок')
    }
  }, [updatePagesInState, success, showError, selectedElement])

  const handleBlockReorder = useCallback(async (pageId, orderedBlockIds) => {
    updatePagesInState(pages =>
      pages?.map(p => {
        if (p.id !== pageId) return p
        const blockMap = Object.fromEntries((p.blocks || []).map(b => [b.id, b]))
        const reordered = orderedBlockIds
          .map((id, i) => blockMap[id] ? { ...blockMap[id], order: i + 1 } : null)
          .filter(Boolean)
        return { ...p, blocks: reordered }
      })
    )
    try {
      const { default: api } = await import('../../api/client')
      await api.patch(`/courses/pages/${pageId}/blocks/reorder/`, { block_ids: orderedBlockIds })
    } catch (err) {
      console.error('Error reordering blocks:', err)
    }
  }, [updatePagesInState])

  /* ─── Page CRUD ─── */
  const handlePageAdd = useCallback(async (moduleId = null) => {
    try {
      const pageData = { title: 'Новая страница', course_id: courseData?.id, module: moduleId }
      const result = await createCoursePage(courseData?.id, pageData)
      if (moduleId) {
        refreshCourseData(prev => ({
          ...prev,
          modules: prev.modules?.map(m =>
            m.id === moduleId ? { ...m, pages: [...(m.pages || []), { ...result, blocks: [] }] } : m
          ),
        }))
      } else {
        refreshCourseData(prev => ({
          ...prev,
          orphan_pages: [...(prev.orphan_pages || []), { ...result, blocks: [] }],
        }))
      }
      setCurrentPageId(result.id)
      success('Страница создана')
    } catch (err) {
      console.error('Error adding page:', err)
      showError('Не удалось создать страницу')
    }
  }, [courseData?.id, refreshCourseData, success, showError])

  const handlePageUpdate = useCallback(async (pageId, data) => {
    try {
      await updateCoursePage(courseData?.id, pageId, data)
      updatePagesInState(pages => pages?.map(p => p.id === pageId ? { ...p, ...data } : p))
    } catch (err) {
      console.error('Error updating page:', err)
      showError('Не удалось обновить страницу')
    }
  }, [courseData?.id, updatePagesInState, showError])

  const handlePageDelete = useCallback(async (pageId) => {
    try {
      await deleteCoursePage(courseData?.id, pageId)
      updatePagesInState(pages => pages?.filter(p => p.id !== pageId))
      if (currentPageId === pageId) setCurrentPageId(null)
      if (selectedElement?.id === pageId) setSelectedElement(null)
      success('Страница удалена')
    } catch (err) {
      console.error('Error deleting page:', err)
      showError('Не удалось удалить страницу')
    }
  }, [courseData?.id, currentPageId, updatePagesInState, success, showError, selectedElement])

  /* ─── Module CRUD ─── */
  const handleModuleUpdate = useCallback(async (moduleId, data) => {
    try {
      await updateCourseModule(moduleId, data)
      refreshCourseData(prev => ({
        ...prev,
        modules: prev.modules?.map(m => m.id === moduleId ? { ...m, ...data } : m),
      }))
    } catch (err) {
      console.error('Error updating module:', err)
      showError('Не удалось обновить модуль')
    }
  }, [refreshCourseData, showError])

  const handleModuleAdd = useCallback(async () => {
    try {
      const result = await createCourseModule(courseData?.id, {
        title: 'Новый модуль',
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

  const handleModuleDelete = useCallback(async (moduleId) => {
    try {
      const deletedModule = courseData?.modules?.find(m => m.id === moduleId)
      const pageIdsInModule = (deletedModule?.pages || []).map(p => p.id)
      await deleteCourseModule(moduleId)
      refreshCourseData(prev => ({
        ...prev,
        modules: (prev.modules || []).filter(m => m.id !== moduleId),
      }))
      if (selectedElement?.type === 'module' && selectedElement?.id === moduleId) setSelectedElement(null)
      if (pageIdsInModule.includes(currentPageId)) setCurrentPageId(null)
      success('Модуль удалён')
    } catch (err) {
      console.error('Error deleting module:', err)
      showError('Не удалось удалить модуль')
    }
  }, [courseData, refreshCourseData, success, showError, selectedElement, currentPageId])

  /* ─── DnD handler (shared context for toolbox + canvas) ─── */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over) return

    const dragData = active.data.current

    // Toolbox block dropped onto the page
    if (dragData?.source === 'toolbox' && currentPageId) {
      handleBlockAdd(dragData.blockType, currentPageId)
      return
    }

    // Sortable reorder within the same page
    if (dragData?.sortable) {
      const overData = over.data.current
      if (overData?.sortable) {
        const oldIndex = blockIds.indexOf(active.id)
        const newIndex = blockIds.indexOf(over.id)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = arrayMove(blockIds, oldIndex, newIndex).map(id =>
            parseInt(id.replace('block-', ''))
          )
          handleBlockReorder(currentPageId, newOrder)
        }
      }
    }
  }, [currentPageId, blockIds, handleBlockAdd, handleBlockReorder])

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="flex h-full bg-gray-100">
        {/* Toolbox */}
        <ToolboxPanel
          currentPageId={currentPageId}
          onBlockAdd={handleBlockAdd}
        />

        {/* Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <CanvasArea
            course={courseData}
            allPages={allPages}
            currentPageId={currentPageId}
            currentPage={currentPage}
            sortedBlocks={sortedBlocks}
            blockIds={blockIds}
            selectedElement={selectedElement}
            onElementSelect={handleElementSelect}
            onPageChange={handlePageChange}
            onPageAdd={handlePageAdd}
            onPageUpdate={handlePageUpdate}
            onPageDelete={handlePageDelete}
            onBlockUpdate={handleBlockUpdate}
            onBlockDelete={handleBlockDelete}
            onModuleAdd={handleModuleAdd}
            onModuleUpdate={handleModuleUpdate}
            onModuleDelete={handleModuleDelete}
          />
        </div>

        {/* Properties */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          <PropertiesPanel
            selectedElement={selectedElement}
            onBlockUpdate={handleBlockUpdate}
            onPageUpdate={handlePageUpdate}
            onPageDelete={handlePageDelete}
            onModuleUpdate={handleModuleUpdate}
            onModuleDelete={handleModuleDelete}
          />
        </div>
      </div>
    </DndContext>
  )
}

export default CourseBuilder
