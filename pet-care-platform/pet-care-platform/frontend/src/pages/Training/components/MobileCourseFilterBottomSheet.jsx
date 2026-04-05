/**
 * Мобильные фильтры курсов: нижняя шторка (как в магазине) — ручка, затемнение, свайп вниз.
 */

import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { FilterSidebar } from './CourseFilters'

const SHEET_Z = 50230
const BACKDROP_Z = 50220

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function MobileCourseFilterBottomSheet({
  isOpen,
  onClose,
  filters,
  availableFilters,
  onFilterChange,
  onPriceApply,
  onReset,
  isLoading,
  courseCount = 0,
}) {
  const dragControls = useDragControls()
  const previousOverflow = useRef('')

  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return undefined
    previousOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow.current
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  const handleDragEnd = useCallback(
    (_, info) => {
      if (info.offset.y > 100 || info.velocity.y > 450) onClose()
    },
    [onClose]
  )

  const node = (
    <AnimatePresence>
      {isOpen && (
        <div className="lg:hidden" aria-hidden={!isOpen}>
          <motion.div
            key="backdrop"
            role="presentation"
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            style={{ zIndex: BACKDROP_Z }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-filter-sheet-title"
            className="fixed inset-x-0 bottom-0 flex max-h-[min(92dvh,880px)] flex-col rounded-t-3xl border border-primary-200/90 border-b-0 bg-white shadow-[0_-12px_48px_rgba(82,47,129,0.14)]"
            style={{
              zIndex: SHEET_Z,
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
          >
            <div
              className="shrink-0 cursor-grab rounded-t-3xl bg-white active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex justify-center pt-2.5 pb-2" aria-hidden>
                <div className="h-1 w-11 rounded-full bg-primary-200" />
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-primary-100 px-4 pb-3">
                <h2 id="course-filter-sheet-title" className="text-lg font-semibold text-primary-800">
                  Фильтры
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-200/90 bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label="Закрыть"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <FilterSidebar
                filters={filters}
                availableFilters={availableFilters}
                onFilterChange={onFilterChange}
                onPriceApply={onPriceApply}
                onReset={onReset}
                isLoading={isLoading}
                courseCount={courseCount}
                largeButtons
                hideShellHeader
                onShowResults={onClose}
                className="rounded-none border-0 shadow-none flex min-h-0 flex-1 flex-col"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(node, document.body)
}
