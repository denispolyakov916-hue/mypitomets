import LegalHtmlPage from './LegalHtmlPage'
import html from './content/distribution.html?raw'

export default function DistributionConsent() {
  return (
    <LegalHtmlPage
      title="Согласие на обработку персональных данных, разрешённых для распространения"
      kicker="Публикация отзывов и фото"
      ghost="◈"
      html={html}
      related={[
        { to: '/privacy', label: 'Политика конфиденциальности' },
        { to: '/consent', label: 'Согласие на обработку ПДн' },
        { to: '/terms', label: 'Пользовательское соглашение' },
        { to: '/marketing-consent', label: 'Согласие на рекламные сообщения' },
      ]}
    />
  )
}
