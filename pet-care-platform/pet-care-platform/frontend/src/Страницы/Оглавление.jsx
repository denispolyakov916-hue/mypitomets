import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const PAGE_GROUPS = [
  {
    title: 'Публичные',
    pages: [
      { title: 'Главная', to: '/pages/home' },
      { title: 'Вход (страница)', to: '/pages/login-page' },
      { title: 'Регистрация (страница)', to: '/pages/register-page' },
      { title: 'Авторизация (модалка)', to: '/pages/auth-modal' },
      { title: 'Активация', to: '/pages/activate' },
      { title: 'Восстановление пароля', to: '/pages/forgot-password' },
      { title: 'Сброс пароля', to: '/pages/reset-password' },
      { title: 'Магазин', to: '/pages/shop' },
      { title: 'Товар (пример id=1)', to: '/pages/shop/products/1' },
      { title: 'Породы', to: '/pages/breeds' },
      { title: 'Порода (пример slug=labrador-retriever)', to: '/pages/breeds/labrador-retriever' },
      { title: 'Курсы', to: '/pages/courses' },
      { title: 'Курс (пример id=1)', to: '/pages/courses/1' }
    ]
  },
  {
    title: 'Требуют авторизации (могут показывать ошибки без JWT)',
    pages: [
      { title: 'Pet ID (список/создание)', to: '/pages/pet-id' },
      { title: 'Питомец (пример id=1)', to: '/pages/pet-id/1' },
      { title: 'Редактирование питомца (пример petId=1)', to: '/pages/pets/1/edit' },
      { title: 'Подбор питания', to: '/pages/food-recommendation' },
      { title: 'Корзина', to: '/pages/cart' },
      { title: 'Избранное', to: '/pages/favorites' },
      { title: 'Оформление заказа', to: '/pages/checkout' },
      { title: 'Выбор способа оплаты', to: '/pages/payment-method' },
      { title: 'Оплата', to: '/pages/payment' },
      { title: 'Профиль', to: '/pages/profile' },
      { title: 'Настройки', to: '/pages/settings' },
      { title: 'Заказы', to: '/pages/orders' },
      { title: 'Заказ (пример id=1)', to: '/pages/orders/1' },
      { title: 'Дневник здоровья', to: '/pages/health-diary' },
      { title: 'Обучение курсу (пример courseId=1)', to: '/pages/training/courses/1/learn' },
      { title: 'Страница урока (пример courseId=1, pageId=1)', to: '/pages/training/courses/1/learn/pages/1' },
      { title: 'Конструктор курса (пример courseId=1)', to: '/pages/admin/courses/1/builder' }
    ]
  },
  {
    title: 'Служебные / ошибки',
    pages: [
      { title: '404', to: '/pages/404' },
      { title: '400', to: '/pages/400' },
      { title: '403', to: '/pages/403' },
      { title: '500', to: '/pages/500' }
    ]
  }
]

function PagesIndex() {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PAGE_GROUPS

    return PAGE_GROUPS
      .map(g => ({
        ...g,
        pages: g.pages.filter(p => p.title.toLowerCase().includes(q) || p.to.toLowerCase().includes(q))
      }))
      .filter(g => g.pages.length > 0)
  }, [query])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Страницы (для редизайна)</h1>
        <p className="mt-2 text-sm text-gray-600">
          Это “витрина” существующих страниц фронта. Часть страниц использует данные с API — без авторизации/данных
          могут быть пустые состояния или ошибки, но верстка и компоненты будут видны.
        </p>
      </div>

      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: например «магазин», «pet», «/orders/1»"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      <div className="space-y-8">
        {groups.map(group => (
          <section key={group.title}>
            <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.pages.map(page => (
                <Link
                  key={page.to}
                  to={page.to}
                  className="rounded-xl border border-gray-200 bg-white p-4 hover:border-primary-200 hover:shadow-sm transition"
                >
                  <div className="font-medium text-gray-900">{page.title}</div>
                  <div className="mt-1 text-xs text-gray-500">{page.to}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default PagesIndex
