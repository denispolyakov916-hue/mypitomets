/**
 * LegalHtmlPage — «журнальный» шаблон для юридических документов.
 *
 * Контент документа передаётся дословным HTML-фрагментом (props.html), собранным
 * программно из исходного .docx (см. scripts/clean_legal.py) — текст НЕ меняется.
 * Шаблон добавляет hero, оглавление (автоматически из h2), брендовую типографику,
 * стилизованные таблицы, кнопки «печать» и «наверх».
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import '../../styles/legal.css'

export default function LegalHtmlPage({
  title,
  kicker = 'Правовой документ',
  ghost = '§',
  updatedAt,
  operator = 'ООО «ПИТОМЕЦПЛЮС»',
  ogrn = '1267700128860',
  html,
  related = [],
}) {
  const proseRef = useRef(null)
  const [toc, setToc] = useState([])
  const [activeId, setActiveId] = useState('')
  const [showTop, setShowTop] = useState(false)

  // Оглавление и scrollspy строим из отрендеренных заголовков разделов (h2[id]).
  useEffect(() => {
    const root = proseRef.current
    if (!root) return undefined
    const heads = Array.from(root.querySelectorAll('h2[id]'))
    setToc(heads.map((h) => ({ id: h.id, text: h.textContent.trim() })))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id) })
      },
      { rootMargin: '-15% 0px -75% 0px' },
    )
    heads.forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [html])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const readingMin = useMemo(() => {
    const words = (html || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length
    return Math.max(1, Math.round(words / 180))
  }, [html])

  const goTo = (id) => (e) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="legal-shell">
      <header className="legal-hero">
        <span className="legal-hero__ghost" aria-hidden="true">{ghost}</span>
        <div className="legal-hero__inner">
          <span className="legal-hero__kicker">{kicker}</span>
          <h1 className="legal-hero__title">{title}</h1>
          <div className="legal-hero__meta">
            <span className="legal-hero__chip">Оператор: <b>{operator}</b></span>
            <span className="legal-hero__chip">ОГРН <b>{ogrn}</b></span>
            {updatedAt && <span className="legal-hero__chip">Редакция: <b>{updatedAt}</b></span>}
            <span className="legal-hero__chip">~{readingMin} мин чтения</span>
          </div>
        </div>
      </header>

      <div className="legal-body">
        <aside className="legal-toc" aria-label="Содержание документа">
          <p className="legal-toc__title">Содержание</p>
          <nav>
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={goTo(item.id)}
                className={`legal-toc__link${activeId === item.id ? ' is-active' : ''}`}
              >
                {item.text}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => window.print()}
            className="legal-toc__link"
            style={{ border: 0, background: 'transparent', marginTop: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer className="h-4 w-4" /> Печать / сохранить PDF
          </button>
        </aside>

        {/* eslint-disable-next-line react/no-danger -- собственный доверенный юр.текст, не пользовательский ввод */}
        <article ref={proseRef} className="legal-prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {related.length > 0 && (
        <section className="legal-related" aria-label="Связанные документы">
          <p className="legal-related__title">Связанные документы</p>
          <div className="legal-related__grid">
            {related.map((r) => (
              <Link key={r.to} to={r.to} className="legal-related__card">
                <span>{r.label}</span><span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showTop && (
        <button type="button" className="legal-top" aria-label="Наверх"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
      )}
    </div>
  )
}
