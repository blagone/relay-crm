import type { CloudWorkspaceDTO } from "@/lib/server/queries";

const actionLabels: Record<string, string> = {
  created: "создал", updated: "обновил", status_changed: "сменил статус",
  archived: "архивировал", restored: "восстановил", note_added: "добавил заметку",
};
const entityLabels: Record<string, string> = { client: "клиента", inquiry: "заявку", note: "к заявке", workspace: "пространство" };

export function ManagerDashboard({ data, today }: { data: CloudWorkspaceDTO; today: string }) {
  const open = data.inquiries.filter(item => !["won", "lost"].includes(item.status));
  const overdue = open.filter(item => item.next_contact_on && item.next_contact_on < today)
    .sort((a, b) => (a.next_contact_on ?? "").localeCompare(b.next_contact_on ?? ""));
  const upcomingLimit = addDays(today, 7);
  const upcoming = open.filter(item => item.next_contact_on && item.next_contact_on >= today && item.next_contact_on <= upcomingLimit)
    .sort((a, b) => (a.next_contact_on ?? "").localeCompare(b.next_contact_on ?? ""));
  const inquiryNames = new Map([...data.inquiries, ...data.archivedInquiries].map(item => [item.id, item.title]));
  const clientNames = new Map([...data.clients, ...data.archivedClients].map(item => [item.id, item.name]));
  const entityName = (type: string, id: string, inquiryId: string | null) => type === "client" ? clientNames.get(id) : inquiryNames.get(type === "note" ? inquiryId ?? "" : id);

  return <>
    <section id="today" className="manager-today">
      <div className="panel-head"><div><p className="eyebrow">РАБОЧИЙ ДЕНЬ</p><h2>Сегодня</h2></div><span>{formatDate(today)}</span></div>
      <div className="attention-columns">
        <article className={overdue.length ? "attention-list overdue" : "attention-list"}><h3>Просрочено · {overdue.length}</h3>{overdue.map(item => <a href={`#inquiry-${item.id}`} key={item.id}><strong>{item.title}</strong><span>{formatDate(item.next_contact_on!)}</span></a>)}{!overdue.length && <p>Просроченных контактов нет.</p>}</article>
        <article className="attention-list"><h3>Ближайшие 7 дней · {upcoming.length}</h3>{upcoming.map(item => <a href={`#inquiry-${item.id}`} key={item.id}><strong>{item.title}</strong><span>{item.next_contact_on === today ? "Сегодня" : formatDate(item.next_contact_on!)}</span></a>)}{!upcoming.length && <p>Контактов на ближайшие дни нет.</p>}</article>
      </div>
    </section>
    <section id="activity" className="panel cloud-activity">
      <div className="panel-head"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Последние действия</h2></div></div>
      <div className="activity">{data.activity.map(event => <article key={event.id}><span/><div><strong>{event.actor_id === data.currentUserId ? "Вы" : `Участник ${event.actor_id?.slice(0, 8) ?? "системы"}`} {actionLabels[event.action] ?? event.action} {entityLabels[event.entity_type] ?? event.entity_type}{entityName(event.entity_type, event.entity_id, event.inquiry_id) ? ` «${entityName(event.entity_type, event.entity_id, event.inquiry_id)}»` : ""}</strong><p>{activityDetail(event.metadata)} · {new Date(event.created_at).toLocaleString("ru-RU")}</p></div></article>)}{!data.activity.length && <div className="empty compact"><p>История появится после первого действия.</p></div>}</div>
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
