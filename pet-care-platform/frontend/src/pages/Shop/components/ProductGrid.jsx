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
    <div className={`flex justify-center items-center gap-1 mt-8 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-primary-100 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || isLoading}
        className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-primary-200 text-gray-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        ←
      </button>

      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          disabled={isLoading}
          className={`px-3 py-2 rounded-lg transition-all duration-200 ${
            num === page
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
              : 'bg-white/90 backdrop-blur-sm border border-primary-200 text-gray-700 hover:bg-primary-50'
          }`}
        >
          {num}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages || isLoading}
        className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-primary-200 text-gray-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        →
      </button>
    </div>
  )
})

/**
 * Оптимизированная сетка товаров
 */
const ProductGrid = memo(function ProductGrid({ products, onAddToCart, isLoading }) {
  if (isLoading && products.length === 0) {
    return <ProductGridSkeleton count={20} />
  }
  
  return (
    <div className={`grid responsive-grid gap-4 transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-scaleIn"
          style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
        >
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
          />
        </div>
      ))}
    </div>
  )
})

export { ProductGrid, Pagination }
