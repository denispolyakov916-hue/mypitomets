/**
 * Компонент сетки курсов
 *
 * Отображение курсов, состояний загрузки/ошибки/пустого результата и пагинации.
 */

import CourseCard from '../../../components/CourseCard'
import { PageLoader } from '../../../components/Loader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Alert } from '../../../components/ui/Alert'

/**
 * Пагинация
 */
function Pagination({ pagination, onPageChange }) {
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
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }
  
  return (
    <div className="flex justify-center items-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ←
      </button>
      
      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={`px-3 py-2 rounded-lg ${
            num === page
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {num}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        →
      </button>
    </div>
  )
}

/**
 * Сетка курсов с состояниями загрузки, ошибки и пустого результата
 */
function CourseGrid({
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
}) {
  if (isLoading) {
    return <PageLoader />
  }

  if (error) {
    return (
      <div className="card py-8">
        <Alert variant="error" title="Ошибка загрузки">
          <p className="mb-3">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">
            Попробовать снова
          </button>
        </Alert>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon="📚"
          title="Курсы не найдены"
          description="Попробуйте изменить параметры фильтра"
          action={
            <button onClick={onReset} className="btn-primary">
              Сбросить фильтры
            </button>
          }
        />
      </div>
    )
  }

  return (
    <>
      <p className="text-gray-600 mb-4">
        Найдено курсов: {pagination?.total || courses.length}
      </p>
      
      <div className="grid responsive-grid gap-4">
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            isOwned={ownedCourseIds.has(course.id)}
            isInCart={!!getCourseInCart(course.id)}
            onAddToCart={onAddToCart}
            onEnrollFree={onEnrollFree}
            isLoading={addingCourseId === course.id}
          />
        ))}
      </div>
      
      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </>
  )
}

export { CourseGrid, Pagination }
