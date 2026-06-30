/**
 * Меню «Добавить в календарь» для одного мероприятия:
 * - скачать .ics (Apple Calendar / Outlook / импорт в Google),
 * - deep-link «Google Календарь».
 * Подписка на ВСЕ свои мероприятия (webcal) — отдельно, на вкладке «Мой календарь».
 */

import { useState } from 'react'
import { CalendarPlus, Download, ExternalLink } from 'lucide-react'
import { BrandButton } from '../../components/brand'
import { eventIcsUrl, googleCalendarUrl } from '../../api/events'

export default function AddToCalendarMenu({ event }) {
  const [open, setOpen] = useState(false)
  if (!event) return null

  const itemClass =
    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50'

  return (
    <div className="relative inline-block">
      <BrandButton
        variant="outline"
        leftIcon={<CalendarPlus className="h-5 w-5" />}
        onClick={() => setOpen((v) => !v)}
      >
        Добавить в календарь
      </BrandButton>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 z-20 mt-2 w-64 rounded-2xl border border-primary-100 bg-white p-2 shadow-card">
            <a href={eventIcsUrl(event.id)} className={itemClass} onClick={() => setOpen(false)}>
              <Download className="h-4 w-4" /> Скачать .ics (Apple / Outlook)
            </a>
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="h-4 w-4" /> Google Календарь
            </a>
          </div>
        </>
      )}
    </div>
  )
}
