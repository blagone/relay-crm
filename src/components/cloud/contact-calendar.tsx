import Link from "next/link";
import { buildCalendarDays, shiftCalendarMonth } from "@/lib/cloud/calendar-input";
import type { ContactCalendarDTO } from "@/lib/server/calendar-queries";

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const statusLabels = { new: "Новая", contacted: "Связались", proposal: "Предложение", won: "Выиграна", lost: "Проиграна" } as const;

export function ContactCalendar({ data, month, today }: { data: ContactCalendarDTO; month: string; today: string }) {
  const members = new Map(data.members.map(member => [member.user_id, member.email]));
  const entries = new Map<string, ContactCalendarDTO["inquiries"]>();
  for (const inquiry of data.inquiries) {
    if (!inquiry.next_contact_on) continue;
    const day = entries.get(inquiry.next_contact_on) ?? [];
    day.push(inquiry);
    entries.set(inquiry.next_contact_on, day);
  }
  const title = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  return <main className="calendar-page">
    <header className="calendar-head">
      <div><Link className="text-link" href="/app">← Рабочее пространство</Link><p className="eyebrow">RELAY CRM · КОНТАКТЫ</p><h1>{data.workspace.name}</h1></div>
      <span className="cloud-badge">{data.role}</span>
    </header>
    <section className="panel calendar-panel" aria-labelledby="calendar-title">
      <div className="calendar-toolbar">
        <Link className="secondary" aria-label="Предыдущий месяц" href={`/app/calendar?month=${shiftCalendarMonth(month, -1)}`}>←</Link>
        <div><h2 id="calendar-title">{capitalize(title)}</h2><p>{data.inquiries.length} {plural(data.inquiries.length)}</p></div>
        <Link className="secondary" aria-label="Следующий месяц" href={`/app/calendar?month=${shiftCalendarMonth(month, 1)}`}>→</Link>
      </div>
      <div className="calendar-scroll">
        <div className="calendar-grid" role="grid" aria-labelledby="calendar-title">
          {weekDays.map(day => <div className="calendar-weekday" role="columnheader" key={day}>{day}</div>)}
          {buildCalendarDays(month).map(day => <div className={`calendar-day${day.inMonth ? "" : " outside"}${day.iso === today ? " today" : ""}`} role="gridcell" aria-label={formatDay(day.iso)} key={day.iso}>
            <time dateTime={day.iso}>{day.day}</time>
            <div className="calendar-events">{(entries.get(day.iso) ?? []).map(inquiry => <Link href={`/app#inquiry-${inquiry.id}`} className={`calendar-event ${inquiry.status}`} key={inquiry.id}>
              <strong>{inquiry.title}</strong><span>{statusLabels[inquiry.status]}</span><small>{inquiry.assignee_id ? members.get(inquiry.assignee_id) ?? "Участник команды" : "Без ответственного"}</small>
            </Link>)}</div>
          </div>)}
        </div>
      </div>
    </section>
  </main>;
}

function formatDay(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function plural(value: number) { const mod100 = value % 100, mod10 = value % 10; return mod100 >= 11 && mod100 <= 14 ? "контактов" : mod10 === 1 ? "контакт" : mod10 >= 2 && mod10 <= 4 ? "контакта" : "контактов"; }
