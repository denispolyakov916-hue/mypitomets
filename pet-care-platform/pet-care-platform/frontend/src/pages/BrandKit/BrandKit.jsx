/**
 * BrandKit — внутренняя demo/kitchen-sink страница (/brand-kit).
 * Назначение: визуальная приёмка брендовых компонентов. Не для продакшн-сценариев.
 */
import { useState } from 'react'
import { PawPrint, Heart, Search, Inbox, Sparkles, ShoppingBag } from 'lucide-react'
import {
  BrandButton, BrandCard, BrandSection, BrandInput,
  BrandBadge, BrandTabs, BrandEmptyState, BrandModal,
} from '../../components/brand'

const TAB_ITEMS = [
  { value: 'all', label: 'Все', icon: <PawPrint className="h-4 w-4" /> },
  { value: 'food', label: 'Питание' },
  { value: 'health', label: 'Здоровье' },
  { value: 'training', label: 'Курсы' },
]

export default function BrandKit() {
  const [tab, setTab] = useState('all')
  const [utab, setUtab] = useState('food')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="bg-milk min-h-screen">
      <BrandSection
        bg="milk"
        title="Brand UI Kit — Питомец Плюс"
        subtitle="Фундамент брендовых компонентов (Этап A). Визуальная приёмка перед раскаткой на страницы."
      >
        <BrandBadge variant="gold">demo / kitchen-sink</BrandBadge>
      </BrandSection>

      {/* Кнопки */}
      <BrandSection bg="white" title="BrandButton" subtitle="Pill-форма, золотой CTA со свечением, глубокий фиолетовый.">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <BrandButton variant="primary" leftIcon={<Sparkles className="h-5 w-5" />}>Начать бесплатно</BrandButton>
            <BrandButton variant="secondary">Узнать больше</BrandButton>
            <BrandButton variant="outline">Outline</BrandButton>
            <BrandButton variant="ghost">Ghost</BrandButton>
            <BrandButton variant="link">Ссылка-кнопка</BrandButton>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BrandButton size="sm">Small</BrandButton>
            <BrandButton size="md">Medium</BrandButton>
            <BrandButton size="lg">Large</BrandButton>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BrandButton isLoading>Загрузка</BrandButton>
            <BrandButton disabled>Disabled</BrandButton>
            <BrandButton variant="secondary" rightIcon={<ShoppingBag className="h-5 w-5" />}>В корзину</BrandButton>
          </div>
          <div className="max-w-sm">
            <BrandButton variant="primary" fullWidth>Полная ширина</BrandButton>
          </div>
        </div>
      </BrandSection>

      {/* Карточки */}
      <BrandSection bg="milk" title="BrandCard" subtitle="Скругление 24px, мягкая фиолетовая тень, hover-подъём.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <BrandCard variant="default" hoverable>
            <h3 className="font-heading font-bold text-lg text-primary-800">Default</h3>
            <p className="mt-2 text-primary-500">Белая карточка на молочном фоне, мягкая тень.</p>
          </BrandCard>
          <BrandCard variant="elevated" hoverable>
            <h3 className="font-heading font-bold text-lg text-primary-800">Elevated</h3>
            <p className="mt-2 text-primary-500">Усиленная брендовая тень для акцента.</p>
          </BrandCard>
          <BrandCard variant="soft">
            <h3 className="font-heading font-bold text-lg text-primary-800">Soft</h3>
            <p className="mt-2 text-primary-500">Молочная поверхность с лёгкой рамкой.</p>
          </BrandCard>
        </div>
      </BrandSection>

      {/* Тёмная секция */}
      <BrandSection bg="gradient" title="BrandSection (gradient)" subtitle="Тёмно-фиолетовая секция — для финального CTA.">
        <BrandButton variant="primary" leftIcon={<Heart className="h-5 w-5" />}>Получить приглашение</BrandButton>
      </BrandSection>

      {/* Поля */}
      <BrandSection bg="white" title="BrandInput" subtitle="Лавандовый фон, золотой фокус, видимый label, helper и ошибка.">
        <div className="grid gap-5 sm:grid-cols-2 max-w-3xl">
          <BrandInput label="Email" type="email" placeholder="you@example.com" required />
          <BrandInput label="Поиск" placeholder="Найти товар…" icon={<Search className="h-5 w-5" />} helper="Подсказка под полем" />
          <BrandInput label="Пароль" type="password" placeholder="••••••••" error="Минимум 8 символов" />
          <BrandInput label="Город" placeholder="Москва" />
        </div>
      </BrandSection>

      {/* Бейджи */}
      <BrandSection bg="milk" title="BrandBadge">
        <div className="flex flex-wrap gap-3">
          <BrandBadge variant="purple">Фиолетовый</BrandBadge>
          <BrandBadge variant="gold">Золото</BrandBadge>
          <BrandBadge variant="soft">Soft</BrandBadge>
          <BrandBadge variant="violet">Violet</BrandBadge>
          <BrandBadge variant="success">Бесплатно</BrandBadge>
          <BrandBadge variant="danger">-45%</BrandBadge>
          <BrandBadge variant="neutral">Кошек</BrandBadge>
        </div>
      </BrandSection>

      {/* Табы */}
      <BrandSection bg="white" title="BrandTabs" subtitle="Pill и underline, управляемые.">
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm text-primary-400">Pill (выбран: {tab})</p>
            <BrandTabs items={TAB_ITEMS} value={tab} onChange={setTab} />
          </div>
          <div>
            <p className="mb-3 text-sm text-primary-400">Underline (выбран: {utab})</p>
            <BrandTabs variant="underline" items={TAB_ITEMS} value={utab} onChange={setUtab} />
          </div>
        </div>
      </BrandSection>

      {/* Пустое состояние */}
      <BrandSection bg="milk" title="BrandEmptyState">
        <BrandCard variant="default" padding="lg">
          <BrandEmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="Здесь пока пусто"
            description="Добавьте питомца в профиль — и мы подберём товары и курсы под него."
            action={<BrandButton variant="primary">Добавить питомца</BrandButton>}
          />
        </BrandCard>
      </BrandSection>

      {/* Модалка */}
      <BrandSection bg="white" title="BrandModal">
        <BrandButton variant="secondary" onClick={() => setModalOpen(true)}>Открыть модалку</BrandButton>
        <BrandModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Брендовая модалка"
          footer={(
            <>
              <BrandButton variant="ghost" onClick={() => setModalOpen(false)}>Отмена</BrandButton>
              <BrandButton variant="primary" onClick={() => setModalOpen(false)}>Подтвердить</BrandButton>
            </>
          )}
        >
          <p className="text-primary-600">
            Фиолетовый scrim с размытием, скругление 24px, закрытие по ESC и клику вне окна.
          </p>
          <div className="mt-4">
            <BrandInput label="Имя питомца" placeholder="Например, Пуф" />
          </div>
        </BrandModal>
      </BrandSection>
    </div>
  )
}
