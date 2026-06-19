/**
 * BrandModal — брендовая модалка: фиолетовый scrim+blur, скругление 24px, ESC/клик-вне.
 */
import { useEffect } from 'react'
import { X } from 'lucide-react'

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export default function BrandModal({ open, onClose, title, size = 'md', footer, className = '', children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title || 'Диалог'}>
      <div className="absolute inset-0 bg-primary-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={['relative w-full rounded-3xl bg-white shadow-brand-xl p-6 animate-fadeIn', sizes[size] || sizes.md, className].join(' ')}>
        {title ? <h3 className="font-heading font-bold text-xl text-primary-800 pr-9">{title}</h3> : null}
        <button type="button" onClick={onClose} aria-label="Закрыть" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-primary-500 transition-colors hover:bg-primary-50">
          <X className="h-5 w-5" />
        </button>
        <div className={title ? 'mt-4' : ''}>{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  )
}
