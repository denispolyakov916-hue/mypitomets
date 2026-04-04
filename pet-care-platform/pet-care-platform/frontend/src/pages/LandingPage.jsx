/**
 * Главная страница — лендинг из pitometsplus-site.
 * Рендерит статический HTML лендинг в iframe; ссылки в лендинге ведут в приложение (target="_parent").
 * Отображается внутри общего Layout с единым хедером и вкладками по всему проекту.
 */

function LandingPage() {
  return (
    <div className="flex w-full min-w-0 flex-col bg-transparent">
      {/*
        Фиксированная высота окна лендинга: длинный контент листается внутри iframe;
        под iframe остаётся футер приложения — листается вся страница.
      */}
      <iframe
        src="/landing/index.html?noheader=1&nofooter=1"
        title="ПИТОМЕЦПЛЮС — Всё для счастливой жизни вашего питомца"
        className="block h-[calc(100dvh-env(safe-area-inset-top,0px)-3.125rem)] min-h-[calc(100dvh-env(safe-area-inset-top,0px)-3.125rem)] w-full border-0 bg-[#F5F5F5] md:h-[calc(100vh-88px)] md:min-h-[calc(100vh-88px)] lg:h-[calc(100vh-96px)] lg:min-h-[calc(100vh-96px)]"
      />
    </div>
  )
}

export default LandingPage
