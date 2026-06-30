/**
 * RequestAccessPage — страница заявки на партнёрский доступ (/partner-access).
 *
 * Логин-пользователь выбирает роль (Поставщик корма / Специалист по курсам),
 * вводит название компании (только для поставщика) и опциональное сообщение,
 * отправляет заявку. На загрузке и после отправки подтягиваются собственные
 * заявки (GET my/) и показывается статус по каждой роли.
 *
 * Гость (не залогинен) видит приглашение войти со ссылкой на
 * /login?redirect=/partner-access.
 *
 * Предвыбор роли поддерживается через query: /partner-access?role=supplier.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  BrandPage,
  BrandCard,
  BrandButton,
  BrandInput,
  BrandBadge,
} from '../../components/brand'
import {
  PARTNER_ROLES,
  PARTNER_REQUEST_STATUS_LABELS,
  createPartnerAccessRequest,
  getMyPartnerAccessRequests,
} from '../../api/partnerAccess'

const STATUS_BADGE_VARIANT = {
  pending: 'gold',
  approved: 'success',
  rejected: 'danger',
}

// Роль, для которой нужно поле «Название компании».
const ROLE_NEEDS_COMPANY = 'supplier'

function normalizeRole(raw) {
  return PARTNER_ROLES.some((r) => r.value === raw) ? raw : PARTNER_ROLES[0].value
}

function statusLabel(status) {
  return PARTNER_REQUEST_STATUS_LABELS[status] || status
}

// Достаём человекочитаемое сообщение из ошибки axios-клиента.
// На 400 DRF возвращает field-errors ({ requested_role: ['...'] }) — клиент кладёт
// их в err.errors. Берём первое такое сообщение, иначе — общий err.message.
function extractErrorMessage(err) {
  const fieldErrors = err?.errors
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const value of Object.values(fieldErrors)) {
      const msg = Array.isArray(value) ? value[0] : value
      if (typeof msg === 'string' && msg) return msg
    }
  }
  return err?.message || 'Не удалось отправить заявку. Попробуйте позже.'
}

// Гостевой экран (не залогинен) — приглашение войти.
function GuestPrompt() {
  return (
    <BrandPage
      title="Стать партнёром"
      subtitle="Доступ к партнёрским панелям доступен после входа в аккаунт."
      maxWidth="max-w-2xl"
    >
      <BrandCard variant="elevated" padding="lg">
        <p className="text-primary-700">
          Чтобы отправить заявку на доступ к панели поставщика корма или
          специалиста по курсам, войдите в свой аккаунт.
        </p>
        <div className="mt-6">
          <BrandButton as={Link} to="/login?redirect=/partner-access">
            Войти
          </BrandButton>
        </div>
      </BrandCard>
    </BrandPage>
  )
}

// Блок текущих статусов заявок по ролям.
function RequestStatusList({ latestByRole }) {
  if (Object.keys(latestByRole).length === 0) return null
  return (
    <BrandCard variant="soft" padding="md" className="mb-6">
      <h2 className="font-heading font-semibold text-lg text-primary-800 mb-3">
        Ваши заявки
      </h2>
      <ul className="space-y-2">
        {PARTNER_ROLES.map(({ value, label }) => {
          const req = latestByRole[value]
          if (!req) return null
          return (
            <li key={value} className="flex items-center justify-between gap-3">
              <span className="text-primary-700">{label}</span>
              <BrandBadge variant={STATUS_BADGE_VARIANT[req.status] || 'soft'}>
                {statusLabel(req.status)}
              </BrandBadge>
            </li>
          )
        })}
      </ul>
    </BrandCard>
  )
}

// Выбор роли (радио-кнопки в виде карточек).
function RolePicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="block mb-2 font-medium text-sm text-primary-700">
        Какой доступ вам нужен?
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {PARTNER_ROLES.map((role) => {
          const active = value === role.value
          return (
            <label
              key={role.value}
              className={[
                'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition',
                active
                  ? 'border-gold-400 bg-primary-50/70'
                  : 'border-primary-200 hover:border-primary-300',
              ].join(' ')}
            >
              <input
                type="radio"
                name="requested_role"
                value={role.value}
                checked={active}
                onChange={() => onChange(role.value)}
                className="accent-gold-400"
              />
              <span className="text-primary-800 font-medium">{role.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function RequestAccessPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [searchParams] = useSearchParams()

  const initialRole = useMemo(
    () => normalizeRole(searchParams.get('role')),
    [searchParams],
  )

  const [requestedRole, setRequestedRole] = useState(initialRole)
  const [companyName, setCompanyName] = useState('')
  const [message, setMessage] = useState('')

  const [requests, setRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Если в URL поменялся ?role= — синхронизируем выбор.
  useEffect(() => {
    setRequestedRole(initialRole)
  }, [initialRole])

  // Загрузка собственных заявок (на маунте, только для залогиненных).
  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingRequests(false)
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const data = await getMyPartnerAccessRequests()
        if (mounted) setRequests(Array.isArray(data) ? data : [])
      } catch {
        // Тихо: отсутствие заявок не должно ломать форму.
        if (mounted) setRequests([])
      } finally {
        if (mounted) setLoadingRequests(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isAuthenticated])

  // Самая свежая заявка по каждой роли (для блока статусов).
  const latestByRole = useMemo(() => {
    const map = {}
    for (const req of requests) {
      const prev = map[req.requested_role]
      if (!prev || new Date(req.created_at) > new Date(prev.created_at)) {
        map[req.requested_role] = req
      }
    }
    return map
  }, [requests])

  const needsCompany = requestedRole === ROLE_NEEDS_COMPANY

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const created = await createPartnerAccessRequest({
        requested_role: requestedRole,
        company_name: needsCompany ? companyName.trim() : undefined,
        message: message.trim() || undefined,
      })
      setSuccess('Заявка отправлена. Мы рассмотрим её в ближайшее время.')
      setCompanyName('')
      setMessage('')
      // Обновляем список заявок: подменяем/добавляем свежесозданную.
      setRequests((prev) => {
        const rest = prev.filter(
          (r) => r.requested_role !== created.requested_role || r.id !== created.id,
        )
        return [created, ...rest]
      })
    } catch (err) {
      // Клиент разворачивает ошибку в { status, message, errors }; для 400
      // (уже есть заявка / уже есть доступ) показываем пришедшее сообщение.
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Гость — приглашение войти.
  if (!isAuthenticated) {
    return <GuestPrompt />
  }

  return (
    <BrandPage
      title="Стать партнёром"
      subtitle="Запросите доступ к партнёрской панели — поставщика корма или специалиста по курсам."
      maxWidth="max-w-2xl"
    >
      {/* Текущие статусы заявок по ролям */}
      {!loadingRequests && <RequestStatusList latestByRole={latestByRole} />}

      <BrandCard variant="elevated" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Выбор роли */}
          <RolePicker value={requestedRole} onChange={setRequestedRole} />

          {/* Название компании — только для поставщика */}
          {needsCompany && (
            <BrandInput
              label="Название компании"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ООО «Корма для всех»"
            />
          )}

          {/* Сопроводительное сообщение */}
          <div className="w-full">
            <label
              htmlFor="partner-message"
              className="block mb-1.5 font-medium text-sm text-primary-700"
            >
              Сообщение (необязательно)
            </label>
            <textarea
              id="partner-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Расскажите немного о себе или компании"
              className="w-full rounded-2xl bg-primary-50/70 px-4 py-3 text-primary-900 placeholder-primary-400 border-2 border-primary-200 outline-none transition hover:border-primary-300 focus:border-gold-400 focus:ring-4 focus:ring-gold-300/40"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600" role="status">
              {success}
            </p>
          )}

          <BrandButton type="submit" isLoading={submitting} disabled={submitting}>
            Отправить заявку
          </BrandButton>
        </form>
      </BrandCard>
    </BrandPage>
  )
}
