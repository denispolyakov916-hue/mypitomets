/**
 * LegalDocument — общая оболочка для правовых документов «ПИТОМЕЦПЛЮС».
 *
 * Использует брендовые компоненты (BrandPage, BrandCard, BrandBadge) для
 * единообразной типографики и фона. Принимает заголовок, дату редакции и
 * массив секций { heading, body } или произвольный children.
 *
 * ВНИМАНИЕ (для человека): это ШАБЛОН, требует юридической проверки.
 */
import { Link } from 'react-router-dom'
import { BrandPage, BrandCard, BrandBadge } from '../../components/brand'

const OPERATOR = 'ООО «ПИТОМЕЦПЛЮС»'

/**
 * Section — заголовок + абзацы документа.
 * body: строка | массив строк | произвольный JSX.
 */
export function LegalSection({ index, heading, body }) {
  const paragraphs = Array.isArray(body) ? body : [body]
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-heading text-xl md:text-2xl font-bold text-primary-800">
        {index != null ? `${index}. ` : ''}{heading}
      </h2>
      <div className="mt-3 space-y-3 text-primary-600 leading-relaxed">
        {paragraphs.map((p, i) =>
          typeof p === 'string' ? <p key={i}>{p}</p> : <div key={i}>{p}</div>,
        )}
      </div>
    </section>
  )
}

export default function LegalDocument({ title, subtitle, updatedAt, sections = [], children }) {
  return (
    <BrandPage title={title} subtitle={subtitle}>
      <BrandCard variant="default" padding="lg" className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-primary-100 pb-5">
          <BrandBadge variant="purple">{OPERATOR}</BrandBadge>
          {updatedAt ? (
            <span className="text-sm text-primary-400">Редакция от {updatedAt}</span>
          ) : null}
        </div>

        <div className="mt-6">
          {sections.map((s, i) => (
            <LegalSection key={s.heading} index={i + 1} heading={s.heading} body={s.body} />
          ))}
          {children}
        </div>

        <div className="mt-10 border-t border-primary-100 pt-5 text-sm text-primary-400">
          <p>
            По любым вопросам, связанным с настоящим документом, обращайтесь по адресу{' '}
            <a href="mailto:legal@pitometsplus.ru" className="text-primary-600 underline hover:text-primary-800">
              legal@pitometsplus.ru
            </a>
            .
          </p>
          <p className="mt-2">
            Смотрите также:{' '}
            <Link to="/privacy" className="text-primary-600 underline hover:text-primary-800">Политика конфиденциальности</Link>,{' '}
            <Link to="/terms" className="text-primary-600 underline hover:text-primary-800">Пользовательское соглашение</Link>,{' '}
            <Link to="/consent" className="text-primary-600 underline hover:text-primary-800">Согласие на обработку ПДн</Link>,{' '}
            <Link to="/offer" className="text-primary-600 underline hover:text-primary-800">Публичная оферта</Link>.
          </p>
        </div>
      </BrandCard>
    </BrandPage>
  )
}
