import LegalHtmlPage from './LegalHtmlPage'
import html from './content/marketing.html?raw'

export default function MarketingConsent() {
  return (
    <LegalHtmlPage
      title="Согласие на получение рекламных, рекламно-информационных и маркетинговых сообщений"
      kicker="Рассылки и предложения"
      ghost="✉"
      html={html}
      related={[
        { to: '/privacy', label: 'Политика конфиденциальности' },
        { to: '/consent', label: 'Согласие на обработку ПДн' },
        { to: '/cookie', label: 'Cookie и веб-аналитика' },
        { to: '/terms', label: 'Пользовательское соглашение' },
      ]}
    />
  )
}
