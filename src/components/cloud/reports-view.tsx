import Link from "next/link";
import { money } from "@/lib/domain";
import { calculateReportMetrics, reportStatusLabels } from "@/lib/cloud/report-metrics";
import type { ReportPeriod } from "@/lib/cloud/report-input";
import type { ReportWorkspaceDTO } from "@/lib/server/report-queries";

const periods: { value: ReportPeriod; label: string }[] = [
  { value: "30", label: "30 дней" }, { value: "90", label: "90 дней" }, { value: "365", label: "Год" }, { value: "all", label: "Всё время" },
];

export function ReportsView({ data, period }: { data: ReportWorkspaceDTO; period: ReportPeriod }) {
  const report = calculateReportMetrics(data.inquiries, data.members, period);
  const previousLabel = period === "all" ? "Сравнение недоступно" : `Предыдущие ${period} дней`;
  return <main className="reports-page">
    <header className="reports-head">
      <div><Link className="text-link" href="/app">← Рабочее пространство</Link><p className="eyebrow">RELAY CRM · ОТЧЁТЫ</p><h1>{data.workspace.name}</h1></div>
      <span className="cloud-badge">{data.role}</span>
    </header>
    <nav className="report-periods" aria-label="Период отчёта">{periods.map(item => <Link key={item.value} aria-current={period === item.value ? "page" : undefined} href={`/app/reports?period=${item.value}`}>{item.label}</Link>)}</nav>
    <section className="metrics report-summary" aria-label="Итоги периода">
      <article><span>Заявки</span><strong>{report.total}</strong><small>{previousLabel}: {report.previousTotal}</small></article>
      <article><span>Сумма заявок</span><strong>{money(report.totalAmountMinor)}</strong><small>созданы за период</small></article>
      <article><span>Выиграно</span><strong>{money(report.wonAmountMinor)}</strong><small>{report.wonCount} заявок · ранее: {report.previousWonCount}</small></article>
      <article><span>Конверсия решений</span><strong>{percent(report.decisionConversion)}</strong><small>выиграно из won + lost</small></article>
    </section>
    <div className="report-grid">
      <section className="panel report-panel"><div className="panel-head"><div><p className="eyebrow">ПЕРИОД</p><h2>Воронка</h2></div><span>Общая конверсия: {percent(report.overallConversion)}</span></div>
        <div className="report-table" role="table" aria-label="Воронка продаж">
          <div className="report-row report-row-head" role="row"><span>Этап</span><span>Заявки</span><span>Сумма</span></div>
          {report.funnel.map(row => <div className="report-row" role="row" key={row.status}><span><i className={`status ${row.status}`}>{reportStatusLabels[row.status]}</i></span><strong>{row.count}</strong><b>{money(row.amountMinor)}</b></div>)}
        </div>
      </section>
      <section className="panel report-panel"><div className="panel-head"><div><p className="eyebrow">ТЕКУЩАЯ НАГРУЗКА</p><h2>Ответственные</h2></div></div>
        <div className="report-table" role="table" aria-label="Нагрузка менеджеров">
          <div className="report-row manager-row report-row-head" role="row"><span>Сотрудник</span><span>В работе</span><span>Просрочено</span><span>Сумма</span></div>
          {report.workload.map(row => <div className="report-row manager-row" role="row" key={row.userId}><span>{row.email}<small>{row.role}</small></span><strong>{row.count}<small>сегодня: {row.dueToday}</small></strong><em className={row.overdue ? "report-danger" : ""}>{row.overdue}</em><b>{money(row.amountMinor)}</b></div>)}
          <div className="report-row manager-row unassigned-row" role="row"><span>Без ответственного</span><strong>{report.unassigned.count}</strong><em>—</em><b>{money(report.unassigned.amountMinor)}</b></div>
        </div>
      </section>
    </div>
  </main>;
}

function percent(value: number) { return new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 }).format(value); }
