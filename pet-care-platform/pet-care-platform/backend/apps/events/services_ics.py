"""
Генерация iCalendar (.ics) для мероприятий.

Один формат для (а) скачивания одного события («Добавить в календарь») и
(б) персонального webcal-фида (Apple/Google опрашивают по подписке). Библиотека
``icalendar`` сама делает UTC-конвертацию tz-aware дат и экранирование.
"""

from django.conf import settings
from icalendar import Calendar
from icalendar import Event as ICalEvent

PRODID = '-//Питомец+//Мероприятия//RU'


def _event_url(event):
    base = (getattr(settings, 'CLIENT_URL', '') or '').rstrip('/')
    return f'{base}/news-events/events/{event.slug}' if base else ''


def build_ics(events, calname='Питомец+ — Мероприятия'):
    """Собрать VCALENDAR (bytes) из списка Event."""
    cal = Calendar()
    cal.add('prodid', PRODID)
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')
    cal.add('method', 'PUBLISH')
    cal.add('x-wr-calname', calname)
    cal.add('x-wr-timezone', 'Europe/Moscow')
    cal.add('x-published-ttl', 'PT12H')

    for ev in events:
        ve = ICalEvent()
        ve.add('uid', f'{ev.id}@petplus')          # стабильный UID → дедуп при повторном опросе
        ve.add('dtstamp', ev.updated_at)
        ve.add('dtstart', ev.start_at)
        if ev.end_at:
            ve.add('dtend', ev.end_at)
        ve.add('summary', ev.title)

        url = _event_url(ev)
        desc_parts = [ev.summary or ev.description or '']
        if url:
            desc_parts.append(url)
        description = '\n\n'.join(p for p in desc_parts if p)
        if description:
            ve.add('description', description)

        location = ev.location or (ev.online_url if ev.is_online else '')
        if location:
            ve.add('location', location)
        if url:
            ve.add('url', url)
        ve.add('status', 'CANCELLED' if ev.status == 'cancelled' else 'CONFIRMED')
        cal.add_component(ve)

    return cal.to_ical()
