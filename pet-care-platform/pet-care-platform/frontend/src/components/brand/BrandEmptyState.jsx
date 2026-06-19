/**
 * BrandEmptyState — дружелюбное пустое состояние с иконкой/иллюстрацией и действием.
 */
export default function BrandEmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={['flex flex-col items-center justify-center text-center py-12 px-6', className].join(' ')}>
      {icon ? (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">{icon}</div>
      ) : null}
      {title ? <h3 className="font-heading font-bold text-xl text-primary-800">{title}</h3> : null}
      {description ? <p className="mt-2 max-w-md text-primary-500">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
