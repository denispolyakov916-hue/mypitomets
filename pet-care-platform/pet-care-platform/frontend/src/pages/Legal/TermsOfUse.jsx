import LegalHtmlPage from './LegalHtmlPage'
import html from './content/terms.html?raw'

export default function TermsOfUse() {
  return (
    <LegalHtmlPage
      title="Пользовательское соглашение"
      kicker="Правила сервиса"
      ghost="§"
      updatedAt="25 мая 2026"
      html={html}
      related={[
        { to: '/offer', label: 'Публичная оферта' },
        { to: '/privacy', label: 'Политика конфиденциальности' },
        { to: '/consent', label: 'Согласие на обработку ПДн' },
        { to: '/sellers', label: 'Продавцы и партнёры' },
      ]}
    />
  )
}
