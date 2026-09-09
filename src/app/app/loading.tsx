export default function AppLoading() {
  return <main className="route-state" aria-busy="true" aria-live="polite">
    <div className="route-state-mark" aria-hidden="true">R</div>
    <h1>Загружаем рабочее пространство</h1>
    <p>Получаем клиентов, заявки и последние изменения…</p>
    <div className="route-state-skeleton"><span/><span/><span/></div>
  </main>;
}
