import Link from "next/link";

const features = [
  ["Воронка и задачи", "Канбан, список, статусы, ближайшие контакты и просрочки в одном рабочем дне."],
  ["Команда и контроль", "Роли, приглашения, аудит действий, архив и безопасное разграничение доступа."],
  ["Данные и отчёты", "Календарь, отчёты, CSV-импорт и экспорт, вложения и быстрый поиск."],
];
const technologies = ["Next.js 16", "TypeScript", "Supabase", "PostgreSQL + RLS", "Vercel", "Vitest"];

export default function Home() {
  return <main className="portfolio-home">
    <nav className="portfolio-nav"><Link className="portfolio-brand" href="/"><span>R</span> Relay CRM</Link><div><Link href="#features">Возможности</Link><Link href="#stack">Стек</Link><Link className="secondary" href="/app">Открыть CRM</Link></div></nav>
    <section className="portfolio-hero">
      <div className="portfolio-copy"><p className="eyebrow">PRODUCT CASE · 2026</p><h1>CRM, в которой <em>следующий шаг</em> всегда виден.</h1><p>Relay CRM — портфолио-проект для небольшой команды: клиенты, сделки, контакты, аналитика и рабочий ритм без тяжёлого интерфейса.</p><div className="landing-actions"><Link className="primary" href="/demo">Посмотреть интерактивное демо</Link><Link className="text-link" href="/app">Войти в рабочий кабинет →</Link></div><div className="portfolio-proof"><span><b>92</b> теста</span><span><b>5</b> ролей и сценариев</span><span><b>100%</b> адаптивный UI</span></div></div>
      <div className="product-preview" aria-label="Превью интерфейса Relay CRM"><div className="preview-sidebar"><strong><i>R</i> Relay</strong><span className="selected">Сегодня</span><span>Заявки</span><span>Клиенты</span><span>Календарь</span><span>Отчёты</span></div><div className="preview-main"><header><small>WORKSPACE</small><h2>Семпай AniCat</h2></header><div className="preview-metrics"><article><small>В работе</small><b>12</b></article><article><small>Воронка</small><b>248 000 ₽</b></article><article><small>Выиграно</small><b>86 000 ₽</b></article></div><div className="preview-board"><div><b>Новые</b><span>4</span><article>Новый сайт<small>Алина · 40 000 ₽</small></article></div><div><b>Связались</b><span>3</span><article>Поддержка<small>Игорь · 18 000 ₽</small></article></div><div><b>Предложение</b><span>2</span><article>Редизайн<small>Аня · 90 000 ₽</small></article></div></div></div></div>
    </section>
    <section id="features" className="portfolio-section"><div className="section-heading"><p className="eyebrow">ПОЛНЫЙ ЦИКЛ РАБОТЫ</p><h2>Не макет. Рабочее приложение.</h2><p>Каждая функция связана с реальными данными, правами доступа и историей изменений.</p></div><div className="portfolio-feature-grid">{features.map(([title, text], index) => <article key={title}><b>0{index + 1}</b><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="portfolio-flow"><div><p className="eyebrow">СЦЕНАРИЙ</p><h2>От лида до результата</h2></div><ol><li><b>01</b><span>Клиент и заявка</span></li><li><b>02</b><span>Контакт и задача</span></li><li><b>03</b><span>Предложение</span></li><li><b>04</b><span>Отчёт и история</span></li></ol></section>
    <section id="stack" className="portfolio-section stack-section"><div className="section-heading"><p className="eyebrow">ENGINEERING</p><h2>Стек и качество</h2></div><div className="tech-list">{technologies.map(tech => <span key={tech}>{tech}</span>)}</div><p className="stack-note">Аутентификация, tenant-isolation на RLS, оптимистичная блокировка изменений, audit log, адаптивная верстка, светлая и тёмная темы.</p></section>
    <footer className="portfolio-footer"><div><strong>Relay CRM</strong><span>Portfolio product case</span></div><div><Link className="primary" href="/demo">Открыть демо</Link><Link className="secondary" href="/app">Рабочий кабинет</Link></div></footer>
  </main>;
}
