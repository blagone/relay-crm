import type { CSSProperties } from "react";
import { money } from "@/lib/domain";
import type { CloudWorkspaceDTO } from "@/lib/server/queries";

const actionLabels: Record<string, string> = {
  created: "создал", updated: "обновил", status_changed: "сменил статус",
  archived: "архивировал", restored: "восстановил", note_added: "добавил заметку",
};
const entityLabels: Record<string, string> = { client: "клиента", inquiry: "заявку", note: "к заявке", workspace: "пространство" };
const funnelStatuses = [
  { key: "new", label: "Новые" },
  { key: "contacted", label: "Связались" },
  { key: "proposal", label: "Предложение" },
  { key: "won", label: "Выиграно" },
  { key: "lost", label: "Проиграно" },
] as const;
const defaultActivityCount = 5;

export function ManagerDashboard({ data, today }: { data: CloudWorkspaceDTO; today: string }) {
  const open = data.inquiries.filter(item => !["won", "lost"].includes(item.status));
  const assignedToMe = open.filter(item => item.assignee_id === data.currentUserId);
  const unassigned = open.filter(item => !item.assignee_id);
  const overdue = assignedToMe.filter(item => item.next_contact_on && item.next_contact_on < today)
    .sort((a, b) => (a.next_contact_on ?? "").localeCompare(b.next_contact_on ?? ""));
  const upcomingLimit = addDays(today, 7);
  const upcoming = assignedToMe.filter(item => item.next_contact_on && item.next_contact_on >= today && item.next_contact_on <= upcomingLimit)
    .sort((a, b) => (a.next_contact_on ?? "").localeCompare(b.next_contact_on ?? ""));
  const inquiryNames = new Map([...data.inquiries, ...data.archivedInquiries].map(item => [item.id, item.title]));
  const clientNames = new Map([...data.clients, ...data.archivedClients].map(item => [item.id, item.name]));
  const entityName = (type: string, id: string, inquiryId: string | null) => type === "client" ? clientNames.get(id) : inquiryNames.get(type === "note" ? inquiryId ?? "" : id);
  const funnel = funnelStatuses.map(status => {
    const inquiries = data.inquiries.filter(item => item.status === status.key);
    return { ...status, count: inquiries.length, amount: inquiries.reduce((sum, item) => sum + item.amount_minor, 0) };
  });
  const maxFunnelCount = Math.max(1, ...funnel.map(stage => stage.count));
  const recentActivity = data.activity.slice(0, defaultActivityCount);
  const olderActivity = data.activity.slice(defaultActivityCount);
  const renderActivity = (event: CloudWorkspaceDTO["activity"][number]) => <article key={event.id}><span/><div><strong>{event.actor_id === data.currentUserId ? "Вы" : `Участник ${event.actor_id?.slice(0, 8) ?? "системы"}`} {actionLabels[event.action] ?? event.action} {entityLabels[event.entity_type] ?? event.entity_type}{entityName(event.entity_type, event.entity_id, event.inquiry_id) ? ` «${entityName(event.entity_type, event.entity_id, event.inquiry_id)}»` : ""}</strong><p>{activityDetail(event.metadata)} · {new Date(event.created_at).toLocaleString("ru-RU")}</p></div></article>;

  return <>
    <section className="panel funnel-overview" aria-labelledby="funnel-heading">
      <div className="panel-head"><div><p className="eyebrow">ВОРОНКА</p><h2 id="funnel-heading">Заявки по этапам</h2></div><span>{data.inquiries.length} всего</span></div>
      <div className="funnel-chart">
        {funnel.map(stage => <article className={`funnel-stage ${stage.key}`} key={stage.key}>
          <div className="funnel-stage-head"><span>{stage.label}</span><strong>{stage.count}</strong></div>
          <div className="funnel-track" aria-hidden="true"><span style={{ "--funnel-width": `${stage.count ? Math.max(8, stage.count / maxFunnelCount * 100) : 0}%` } as CSSProperties}/></div>
          <small>{money(stage.amount)}</small>
        </article>)}
      </div>
    </section>
    <section id="today" className="manager-today">
      <div className="panel-head"><div><p className="eyebrow">РАБОЧИЙ ДЕНЬ</p><h2>Сегодня</h2></div><span>{formatDate(today)}</span></div>
      <div className="attention-columns">
        <article className={overdue.length ? "attention-list overdue" : "attention-list"}><h3>Мои просроченные · {overdue.length}</h3>{overdue.map(item => <a href={`#inquiry-${item.id}`} key={item.id}><strong>{item.title}</strong><span>{formatDate(item.next_contact_on!)}</span></a>)}{!overdue.length && <p>Просроченных контактов нет.</p>}</article>
        <article className="attention-list"><h3>Мои ближайшие 7 дней · {upcoming.length}</h3>{upcoming.map(item => <a href={`#inquiry-${item.id}`} key={item.id}><strong>{item.title}</strong><span>{item.next_contact_on === today ? "Сегодня" : formatDate(item.next_contact_on!)}</span></a>)}{!upcoming.length && <p>Контактов на ближайшие дни нет.</p>}</article>
        <article className={unassigned.length ? "attention-list overdue" : "attention-list"}><h3>Без ответственного · {unassigned.length}</h3>{unassigned.slice(0, 10).map(item => <a href={`#inquiry-${item.id}`} key={item.id}><strong>{item.title}</strong><span>Назначить</span></a>)}{!unassigned.length && <p>Все заявки назначены.</p>}</article>
      </div>
    </section>
    <section id="activity" className="panel cloud-activity">
      <div className="panel-head"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Последние действия</h2></div>{data.activity.length > 0 && <span>{data.activity.length} событий</span>}</div>
      <div className="activity">{recentActivity.map(renderActivity)}{!data.activity.length && <div className="empty compact"><p>История появится после первого действия.</p></div>}</div>
      {olderActivity.length > 0 && <details className="activity-more">
        <summary><span className="show-label">Показать ещё {olderActivity.length}</span><span className="hide-label">Свернуть историю</span><span aria-hidden="true">⌄</span></summary>
        <div className="activity">{olderActivity.map(renderActivity)}</div>
      </details>}
    </section>
  </>;
}

function addDays(date: string, days: number) { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function formatDate(date: string) { return new Date(`${date}T00:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }); }
function activityDetail(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "Без дополнительных данных";
  const value = metadata as Record<string, unknown>;
  if (typeof value.from_status === "string" && typeof value.to_status === "string" && value.from_status !== value.to_status) return `${value.from_status} → ${value.to_status}`;
  if (Array.isArray(value.changed_fields) && value.changed_fields.length) return `Поля: ${value.changed_fields.filter(item => typeof item === "string").join(", ")}`;
  return "Изменение сохранено";
}
