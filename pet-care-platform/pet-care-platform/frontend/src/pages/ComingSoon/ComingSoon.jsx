/**
 * Страница-заглушка: сервис пока в разработке.
 * Имя сервиса передаётся через query-параметр name (например /coming-soon?name=Список+продуктов).
 */

import { useSearchParams, Link } from 'react-router-dom'
import { Construction } from 'lucide-react'
import Button from '../../components/ui/Button'

const DEFAULT_SERVICE_NAME = 'Сервис'

export default function ComingSoon() {
  const [searchParams] = useSearchParams()
  const name = searchParams.get('name') || DEFAULT_SERVICE_NAME

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6 text-primary-500" aria-hidden>
          <Construction className="w-20 h-20" strokeWidth={1.2} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Сервис «{name}» в разработке
        </h1>
        <p className="text-gray-600 mb-8">
          Мы работаем над этим разделом. Скоро здесь появится новый функционал.
        </p>
        <Button as={Link} to="/" variant="primary">
          На главную
        </Button>
      </div>
    </div>
  )
}
