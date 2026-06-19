/**
 * BrandInput — поле формы: лавандовый фон, золотой фокус, видимый label, ошибка снизу.
 */
import { forwardRef, useId } from 'react'

const INPUT_BASE = 'w-full rounded-2xl bg-primary-50/70 px-4 py-3 text-primary-900 placeholder-primary-400 border-2 outline-none transition focus:ring-4'

function fieldState({ error, helper, inputId }) {
  return {
    message: error || helper,
    messageId: error ? `${inputId}-err` : `${inputId}-help`,
    border: error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200/50'
      : 'border-transparent focus:border-gold-400 focus:ring-gold-300/40',
    messageClass: error ? 'mt-1.5 text-sm text-red-500' : 'mt-1.5 text-sm text-primary-400',
  }
}

const BrandInput = forwardRef(function BrandInput(
  { label, error, helper, icon, required = false, className = '', id, type = 'text', ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id || autoId
  const { message, messageId, border, messageClass } = fieldState({ error, helper, inputId })
  return (
    <div className={['w-full', className].join(' ')}>
      {label ? (
        <label htmlFor={inputId} className="block mb-1.5 font-medium text-sm text-primary-700">
          {label}{required ? <span className="text-gold-500 ml-0.5">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={[INPUT_BASE, icon ? 'pr-11' : '', border].join(' ')}
          {...rest}
        />
        {icon ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none">{icon}</span> : null}
      </div>
      {message ? <p id={messageId} className={messageClass}>{message}</p> : null}
    </div>
  )
})

export default BrandInput
