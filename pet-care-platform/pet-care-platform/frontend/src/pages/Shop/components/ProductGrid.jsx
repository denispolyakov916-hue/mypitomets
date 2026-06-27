import { memo } from 'react'
import ProductCard from '../../../components/ProductCard'
import { ProductGridSkeleton } from '../../../components/ProductCardSkeleton'

/**
 * Компонент пагинации (мемоизированный)
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
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }
  
  return (
    <div className={`flex justify-center items-center gap-2 mt-8 p-4 rounded-3xl border border-primary-100 bg-milk transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || isLoading}
        className="p-2.5 rounded-full border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          className={`min-w-[2.5rem] py-2.5 px-3 rounded-full font-medium transition-colors ${
            num === page
              ? 'bg-primary-700 text-white'
              : 'border border-primary-200 bg-white text-primary-700 hover:bg-primary-50'
          }`}
        >
          {num}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages || isLoading}
        className="p-2.5 rounded-full border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
 * Оптимизированная сетка товаров
 */
const ProductGrid = memo(function ProductGrid({ products, onAddToCart, isLoading, selectedPet }) {
  if (isLoading && products.length === 0) {
    return <ProductGridSkeleton count={20} />
  }
  
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-5 lg:gap-7 transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-scaleIn"
          style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
        >
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
            pet={selectedPet}
          />
        </div>
      ))}
    </div>
  )
})

export { ProductGrid, Pagination }
