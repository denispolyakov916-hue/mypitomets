/**
 * Компонент сетки курсов
 *
 * Отображение курсов в том же стиле, что и ProductGrid в магазине:
 * скелетон при загрузке, единая сетка, пагинация как в Shop.
 */

import { memo } from 'react'
import CourseCard from '../../../components/CourseCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Alert } from '../../../components/ui/Alert'
import { Skeleton } from '../../../components/ui/Skeleton'

/**
 * Скелетон одной карточки курса
 */
function CourseCardSkeleton() {
  return (
    <div className="courses-catalog-card-frame flex flex-col h-full overflow-hidden animate-pulse">
      <div className="aspect-square bg-gradient-to-br from-stone-100 to-slate-100" />
      <div className="flex-1 flex flex-col p-4">
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-4 w-full rounded mb-1" />
        <Skeleton className="h-4 w-3/4 rounded mb-2" />
        <Skeleton className="h-3 w-24 rounded mb-3" />
        <div className="flex gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-4 h-4 rounded" />
          ))}
        </div>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/**
 * Сетка скелетонов курсов
 */
const CourseGridSkeleton = memo(function CourseGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-scaleIn" style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}>
          <CourseCardSkeleton />
        </div>
      ))}
    </div>
  )
})

/**
 * Пагинация — в стиле Shop (тот же разметка и классы)
 */
const Pagination = memo(function Pagination({ pagination, onPageChange, isLoading }) {
  if (!pagination || pagination.total_pages <= 1) return null

  const { page, total_pages } = pagination

  const getPageNumbers = () => {
    const pages = []
    const showPages = 5
    let start = Math.max(1, page - Math.floor(showPages / 2))
    let end = Math.min(total_pages, start + showPages - 1)
    if (end - start < showPages - 1) {
      start = Math.max(1, end - showPages + 1)
    }
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className={`courses-catalog-pagination flex justify-center items-center gap-2 mt-8 p-4 rounded-xl border transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || isLoading}
        className="p-2.5 rounded-xl border border-stone-200 bg-white text-slate-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Предыдущая страница"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          disabled={isLoading}
          className={`min-w-[2.5rem] py-2.5 px-3 rounded-xl font-medium transition-colors ${
            num === page ? 'bg-slate-700 text-white' : 'border border-stone-200 bg-white text-slate-700 hover:bg-stone-50'
          }`}
        >
          {num}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages || isLoading}
        className="p-2.5 rounded-xl border border-stone-200 bg-white text-slate-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Следующая страница"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
})

/**
 * Сетка курсов с состояниями загрузки, ошибки и пустого результата
 */
const CourseGrid = memo(function CourseGrid({
  courses,
  isLoading,
  error,
  pagination,
  ownedCourseIds,
  getCourseInCart,
  onAddToCart,
  onEnrollFree,
  addingCourseId,
  onPageChange,
  onReset,
  onRetry,
}) {
  if (isLoading && courses.length === 0) {
    return <CourseGridSkeleton count={12} />
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <Alert variant="error" title="Ошибка загрузки">
          <p className="mb-3">{error}</p>
          <button onClick={onRetry} className="btn-primary">
            Попробовать снова
          </button>
        </Alert>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="section-title mb-2">Курсы не найдены</h2>
        <p className="text-gray-600 mb-4">Попробуйте изменить параметры фильтра</p>
        <button onClick={onReset} className="btn-primary">
          Сбросить фильтры
        </button>
      </div>
    )
  }

  return (
    <>
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
        {courses.map((course, index) => (
          <div
            key={course.id}
            className="courses-grid-card animate-scaleIn h-full"
            style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
          >
            <CourseCard
              course={course}
              tone="neutral"
              isOwned={ownedCourseIds.has(course.id)}
              isInCart={!!getCourseInCart(course.id)}
              onAddToCart={onAddToCart}
              onEnrollFree={onEnrollFree}
              isLoading={addingCourseId === course.id}
            />
          </div>
        ))}
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
        isLoading={isLoading}
      />
    </>
  )
})

export { CourseGrid, Pagination, CourseGridSkeleton }
