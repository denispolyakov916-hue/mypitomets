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
  reorderCourseModules,
  reorderCoursePages,
  movePageToModule,
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

  /* ─── Reorder / Move handlers ─── */
  const handleModuleReorder = useCallback(async (moduleId, direction) => {
    const modules = courseData?.modules || []
    const idx = modules.findIndex(m => m.id === moduleId)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= modules.length) return

    const prevModuleIds = modules.map(m => m.id)
    const newModules = [...modules]
    ;[newModules[idx], newModules[targetIdx]] = [newModules[targetIdx], newModules[idx]]
    const newModuleIds = newModules.map(m => m.id)

    refreshCourseData(prev => ({ ...prev, modules: newModules }))

    try {
      await reorderCourseModules(courseData.id, newModuleIds)
      success('Модуль перемещён', {
        action: async () => {
          refreshCourseData(prev => ({
            ...prev,
            modules: prevModuleIds.map(id => prev.modules.find(m => m.id === id)).filter(Boolean),
          }))
          reorderCourseModules(courseData.id, prevModuleIds).catch(console.error)
        },
        actionLabel: 'Отменить',
        duration: 6000,
      })
    } catch (err) {
      refreshCourseData(prev => ({ ...prev, modules }))
      showError('Не удалось переместить модуль')
    }
  }, [courseData, refreshCourseData, success, showError])

  const handlePageReorder = useCallback(async (pageId, direction) => {
    const modules = courseData?.modules || []
    const orphanPages = courseData?.orphan_pages || []

    let moduleId = null
    let pages = []

    for (const m of modules) {
      const found = (m.pages || []).find(p => p.id === pageId)
      if (found) { moduleId = m.id; pages = m.pages || []; break }
    }
    if (!moduleId && orphanPages.find(p => p.id === pageId)) {
      pages = orphanPages
    }

    const idx = pages.findIndex(p => p.id === pageId)
    if (idx === -1) return

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= pages.length) return

    const prevPageIds = pages.map(p => p.id)
    const newPages = [...pages]
    ;[newPages[idx], newPages[targetIdx]] = [newPages[targetIdx], newPages[idx]]
    const newPageIds = newPages.map(p => p.id)

    if (moduleId) {
      refreshCourseData(prev => ({
        ...prev,
        modules: prev.modules?.map(m => m.id === moduleId ? { ...m, pages: newPages } : m),
      }))
    } else {
      refreshCourseData(prev => ({ ...prev, orphan_pages: newPages }))
    }

    try {
      await reorderCoursePages(courseData.id, moduleId, newPageIds)
      success('Страница перемещена', {
        action: async () => {
          if (moduleId) {
            refreshCourseData(prev => ({
              ...prev,
              modules: prev.modules?.map(m =>
                m.id === moduleId
                  ? { ...m, pages: prevPageIds.map(id => m.pages.find(p => p.id === id)).filter(Boolean) }
                  : m
              ),
            }))
          } else {
            refreshCourseData(prev => ({
              ...prev,
              orphan_pages: prevPageIds.map(id => prev.orphan_pages.find(p => p.id === id)).filter(Boolean),
            }))
          }
          reorderCoursePages(courseData.id, moduleId, prevPageIds).catch(console.error)
        },
        actionLabel: 'Отменить',
        duration: 6000,
      })
    } catch (err) {
      if (moduleId) {
        refreshCourseData(prev => ({
          ...prev,
          modules: prev.modules?.map(m => m.id === moduleId ? { ...m, pages } : m),
        }))
      } else {
        refreshCourseData(prev => ({ ...prev, orphan_pages: pages }))
      }
      showError('Не удалось переместить страницу')
    }
  }, [courseData, refreshCourseData, success, showError])

  const handlePageMove = useCallback(async (pageId, targetModuleId) => {
    const modules = courseData?.modules || []

    let sourceModuleId = null
    let sourcePage = null

    for (const m of modules) {
      const found = (m.pages || []).find(p => p.id === pageId)
      if (found) { sourceModuleId = m.id; sourcePage = found; break }
    }
    if (!sourcePage) {
      sourcePage = (courseData?.orphan_pages || []).find(p => p.id === pageId)
    }
    if (!sourcePage) return
    if (sourceModuleId === targetModuleId) return

    // Optimistic: remove from source, add to target
    refreshCourseData(prev => {
      const page = sourcePage
      let newData = { ...prev }

      if (sourceModuleId) {
        newData.modules = prev.modules?.map(m =>
          m.id === sourceModuleId ? { ...m, pages: m.pages.filter(p => p.id !== pageId) } : m
        )
      } else {
        newData.orphan_pages = (prev.orphan_pages || []).filter(p => p.id !== pageId)
      }

      if (targetModuleId) {
        newData.modules = (newData.modules || prev.modules)?.map(m =>
          m.id === targetModuleId ? { ...m, pages: [...(m.pages || []), page] } : m
        )
      } else {
        newData.orphan_pages = [...(newData.orphan_pages || []), page]
      }

      return newData
    })

    try {
      await movePageToModule(pageId, targetModuleId)
      const targetName = targetModuleId
        ? modules.find(m => m.id === targetModuleId)?.title || 'модуль'
        : 'Без модуля'
      success(`Страница перенесена в «${targetName}»`)
    } catch (err) {
      // Revert
      refreshCourseData(prev => {
        let newData = { ...prev }
        if (targetModuleId) {
          newData.modules = prev.modules?.map(m =>
            m.id === targetModuleId ? { ...m, pages: m.pages.filter(p => p.id !== pageId) } : m
          )
        } else {
          newData.orphan_pages = (prev.orphan_pages || []).filter(p => p.id !== pageId)
        }
        if (sourceModuleId) {
          newData.modules = (newData.modules || prev.modules)?.map(m =>
            m.id === sourceModuleId ? { ...m, pages: [...(m.pages || []), sourcePage] } : m
          )
        } else {
          newData.orphan_pages = [...(newData.orphan_pages || []), sourcePage]
        }
        return newData
      })
      showError('Не удалось переместить страницу')
    }
  }, [courseData, refreshCourseData, success, showError])

  const handleBlockMove = useCallback(async (blockId, direction) => {
    const idx = sortedBlocks.findIndex(b => b.id === blockId)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= sortedBlocks.length) return

    const prevOrder = sortedBlocks.map(b => b.id)
    const newOrder = [...prevOrder]
    ;[newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]]

    handleBlockReorder(currentPageId, newOrder)

    success('Блок перемещён', {
      action: () => {
        handleBlockReorder(currentPageId, prevOrder)
      },
      actionLabel: 'Отменить',
      duration: 6000,
    })
  }, [sortedBlocks, currentPageId, handleBlockReorder, success])

  /* ─── DnD handler (shared context for toolbox + canvas + structure tree) ─── */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Sortable reorder within the same page (only DnD use case)
    if (String(active.id).startsWith('block-') && String(over.id).startsWith('block-')) {
      const oldIndex = blockIds.indexOf(active.id)
      const newIndex = blockIds.indexOf(over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(blockIds, oldIndex, newIndex).map(id =>
          parseInt(id.replace('block-', ''))
        )
        handleBlockReorder(currentPageId, newOrder)
      }
      return
    }

    // 3. Module DnD reorder
    if (dragData?.source === 'structure-module' && overData?.source === 'structure-module') {
      const modules = courseData?.modules || []
      const modSortIds = modules.map(m => `structure-module-${m.id}`)
      const oldIndex = modSortIds.indexOf(active.id)
      const newIndex = modSortIds.indexOf(over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newModules = arrayMove([...modules], oldIndex, newIndex)
        const newModuleIds = newModules.map(m => m.id)
        const prevModuleIds = modules.map(m => m.id)

        refreshCourseData(prev => ({ ...prev, modules: newModules }))

        reorderCourseModules(courseData.id, newModuleIds)
          .then(() => {
            success('Модуль перемещён', {
              action: () => {
                refreshCourseData(prev => ({
                  ...prev,
                  modules: prevModuleIds.map(id => prev.modules.find(m => m.id === id)).filter(Boolean),
                }))
                reorderCourseModules(courseData.id, prevModuleIds).catch(console.error)
              },
              actionLabel: 'Отменить',
              duration: 6000,
            })
          })
          .catch(() => {
            refreshCourseData(prev => ({
              ...prev,
              modules: prevModuleIds.map(id => prev.modules.find(m => m.id === id)).filter(Boolean),
            }))
            showError('Не удалось переместить модуль')
          })
      }
      return
    }

    // 4. Page DnD — reorder within module or move between modules
    if (dragData?.source === 'structure-page') {
      const sourceModuleId = dragData.moduleId ?? null

      let targetModuleId = sourceModuleId
      if (overData?.source === 'structure-page') {
        targetModuleId = overData.moduleId ?? null
      } else if (overData?.source === 'structure-module') {
        targetModuleId = overData.moduleId ?? null
      } else if (overData?.source === 'module-droppable') {
        targetModuleId = overData.moduleId ?? null
      } else {
        return
      }

      if (sourceModuleId === targetModuleId && overData?.source === 'structure-page') {
        // Same module: reorder pages
        const module = sourceModuleId ? courseData.modules?.find(m => m.id === sourceModuleId) : null
        const pages = sourceModuleId ? (module?.pages || []) : (courseData?.orphan_pages || [])
        const pageSortIds = pages.map(p => `structure-page-${p.id}`)
        const oldIndex = pageSortIds.indexOf(active.id)
        const newIndex = pageSortIds.indexOf(over.id)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newPages = arrayMove([...pages], oldIndex, newIndex)
          const newPageIds = newPages.map(p => p.id)
          const prevPageIds = pages.map(p => p.id)

          if (sourceModuleId) {
            refreshCourseData(prev => ({
              ...prev,
              modules: prev.modules?.map(m => m.id === sourceModuleId ? { ...m, pages: newPages } : m),
            }))
          } else {
            refreshCourseData(prev => ({ ...prev, orphan_pages: newPages }))
          }

          reorderCoursePages(courseData.id, sourceModuleId, newPageIds)
            .then(() => {
              success('Страница перемещена', {
                action: () => {
                  if (sourceModuleId) {
                    refreshCourseData(prev => ({
                      ...prev,
                      modules: prev.modules?.map(m =>
                        m.id === sourceModuleId
                          ? { ...m, pages: prevPageIds.map(id => m.pages.find(p => p.id === id)).filter(Boolean) }
                          : m
                      ),
                    }))
                  } else {
                    refreshCourseData(prev => ({
                      ...prev,
                      orphan_pages: prevPageIds.map(id => prev.orphan_pages.find(p => p.id === id)).filter(Boolean),
                    }))
                  }
                  reorderCoursePages(courseData.id, sourceModuleId, prevPageIds).catch(console.error)
                },
                actionLabel: 'Отменить',
                duration: 6000,
              })
            })
            .catch(() => {
              if (sourceModuleId) {
                refreshCourseData(prev => ({
                  ...prev,
                  modules: prev.modules?.map(m => m.id === sourceModuleId ? { ...m, pages } : m),
                }))
              } else {
                refreshCourseData(prev => ({ ...prev, orphan_pages: pages }))
              }
              showError('Не удалось переместить страницу')
            })
        }
      } else if (sourceModuleId !== targetModuleId) {
        // Cross-module: move page via existing handler
        handlePageMove(dragData.pageId, targetModuleId)
      }
      return
    }
  }, [courseData, currentPageId, blockIds, handleBlockAdd, handleBlockReorder, handlePageMove, refreshCourseData, success, showError])

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
            courseData={courseData}
            currentPageId={currentPageId}
            sortedBlocks={sortedBlocks}
            onBlockUpdate={handleBlockUpdate}
            onPageUpdate={handlePageUpdate}
            onPageDelete={handlePageDelete}
            onModuleUpdate={handleModuleUpdate}
            onModuleDelete={handleModuleDelete}
            onModuleReorder={handleModuleReorder}
            onPageReorder={handlePageReorder}
            onPageMove={handlePageMove}
            onBlockMove={handleBlockMove}
          />
        </div>
      </div>
    </DndContext>
  )
}

export default CourseBuilder
