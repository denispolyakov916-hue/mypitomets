/**
 * Баннер согласия на использование cookie (документ «Cookie и веб-аналитика»).
 *
 * Показывается, пока пользователь не сделал выбор. Обязательные cookie работают
 * всегда; функциональные / аналитические / рекламные — только по согласию.
 * Выбор сохраняется локально (utils/cookieConsent) и в журнал сервера (/api/consent).
 * Аналитику (напр. Яндекс.Метрику) следует загружать только при hasAnalyticsConsent().
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { getCookieConsent, saveCookieConsent, COOKIE_CONSENT_VERSION } from '../utils/cookieConsent'
import { recordConsent } from '../api/consent'

const CATEGORIES = [
  { key: 'functional', label: 'Функциональные', desc: 'Запоминают настройки и удобство интерфейса.' },
  { key: 'analytics', label: 'Аналитические', desc: 'Статистика посещений и улучшение сервиса (напр. Яндекс.Метрика).' },
  { key: 'advertising', label: 'Рекламные', desc: 'Оценка рекламы и ретаргетинг.' },
]

export default function CookieConsentBanner() {
  const [decided, setDecided] = useState(() => !!getCookieConsent())
  const [customize, setCustomize] = useState(false)
  const [cats, setCats] = useState({ functional: true, analytics: true, advertising: false })

  if (decided) return null

  const commit = (choice) => {
    const saved = saveCookieConsent(choice)
    recordConsent({
      source: 'cookie_banner',
      docVersion: COOKIE_CONSENT_VERSION,
      events: [
        { type: 'cookie_functional', granted: !!saved.functional },
        { type: 'cookie_analytics', granted: !!saved.analytics },
        { type: 'cookie_advertising', granted: !!saved.advertising },
      ],
    })
    setDecided(true)
  }

  const toggle = (key) => setCats((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-4xl rounded-2xl border border-primary-100 bg-white p-4 shadow-[0_10px_40px_rgba(82,47,129,0.18)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Cookie className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-bold text-primary-900">Мы используем cookie</h3>
            <p className="mt-1 text-sm text-primary-600">
              Обязательные cookie нужны для работы сайта. Функциональные, аналитические и рекламные —
              только с вашего согласия. Подробнее — в{' '}
              <Link to="/cookie" className="font-semibold text-primary-700 underline">документе о cookie и веб-аналитике</Link>.
            </p>

            {customize && (
              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-3 text-sm">
                  <input type="checkbox" checked disabled className="mt-0.5" />
                  <span><b className="text-primary-800">Обязательные</b> — всегда включены (авторизация, корзина, безопасность).</span>
                </label>
                {CATEGORIES.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-100 p-3 text-sm hover:bg-gray-50">
                    <input type="checkbox" checked={cats[c.key]} onChange={() => toggle(c.key)} className="mt-0.5" />
                    <span><b className="text-primary-800">{c.label}</b> — {c.desc}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => commit({ functional: true, analytics: true, advertising: true })}
                className="inline-flex items-center justify-center rounded-full bg-gold-400 px-5 py-2.5 text-sm font-semibold text-primary-900 shadow-sm transition-colors hover:bg-gold-500"
              >
                Принять все
              </button>
              {customize ? (
                <button
                  type="button"
                  onClick={() => commit(cats)}
                  className="inline-flex items-center justify-center rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
                >
                  Сохранить выбор
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomize(true)}
                  className="inline-flex items-center justify-center rounded-full border border-primary-200 px-5 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
                >
                  Настроить
                </button>
              )}
              <button
                type="button"
                onClick={() => commit({ functional: false, analytics: false, advertising: false })}
                className="inline-flex items-center justify-center rounded-full border border-primary-200 px-5 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Только необходимые
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
