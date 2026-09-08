"use client";

import { useMemo, useState } from "react";
import { InquiryCard } from "@/components/cloud/inquiry-card";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Inquiry = Tables["inquiries"]["Row"];
type Client = Tables["clients"]["Row"];
type Note = Tables["notes"]["Row"];

export function InquiryWorkspace({ inquiries, archivedInquiries, clients, notes, canWrite, currentUserId, today }: {
  inquiries: Inquiry[]; archivedInquiries: Inquiry[]; clients: Client[]; notes: Note[];
  canWrite: boolean; currentUserId: string; today: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactDate, setContactDate] = useState("");
  const clientNames = useMemo(() => new Map(clients.map(client => [client.id, client.name])), [clients]);
  const notesByInquiry = useMemo(() => {
    const grouped = new Map<string, Note[]>();
    for (const note of notes) grouped.set(note.inquiry_id, [...(grouped.get(note.inquiry_id) ?? []), note]);
    return grouped;
  }, [notes]);
  const filtered = useMemo(() => inquiries.filter(inquiry => {
    const needle = query.trim().toLocaleLowerCase("ru");
    const haystack = `${inquiry.title} ${inquiry.description} ${clientNames.get(inquiry.client_id) ?? ""}`.toLocaleLowerCase("ru");
    return (!needle || haystack.includes(needle)) && (!status || inquiry.status === status) &&
      (!source || inquiry.source === source) && (!clientId || inquiry.client_id === clientId) &&
      (!contactDate || inquiry.next_contact_on === contactDate);
  }), [inquiries, query, status, source, clientId, contactDate, clientNames]);
  const filterActive = Boolean(query || status || source || clientId || contactDate);
  const reset = () => { setQuery(""); setStatus(""); setSource(""); setClientId(""); setContactDate(""); };

  return <>
    <div className="cloud-filters" aria-label="Фильтры заявок">
      <label>Поиск<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Заявка, описание или клиент"/></label>
      <label>Статус<select value={status} onChange={event => setStatus(event.target.value)}><option value="">Все</option><option value="new">Новая</option><option value="contacted">Связались</option><option value="proposal">Предложение</option><option value="won">Выиграна</option><option value="lost">Проиграна</option></select></label>
      <label>Источник<select value={source} onChange={event => setSource(event.target.value)}><option value="">Все</option><option value="website">Сайт</option><option value="telegram">Telegram</option><option value="referral">Рекомендация</option><option value="other">Другое</option></select></label>
      <label>Клиент<select value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Все</option>{clients.filter(client => !client.archived_at).map(client => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
      <label>Дата контакта<input type="date" value={contactDate} onChange={event => setContactDate(event.target.value)}/></label>
      {filterActive && <button className="text-link" type="button" onClick={reset}>Сбросить</button>}
    </div>
    <p className="filter-result">Показано: {filtered.length} из {inquiries.length}</p>
    {filtered.length ? <div className="cloud-inquiry-list">{filtered.map(inquiry => <InquiryCard key={inquiry.id} inquiry={inquiry} clientName={clientNames.get(inquiry.client_id) ?? "Клиент"} canWrite={canWrite} notes={notesByInquiry.get(inquiry.id)} currentUserId={currentUserId} today={today}/>)}</div> : <div className="empty compact"><p>{filterActive ? "По этим фильтрам заявок нет." : "Добавьте первую заявку и проведите её по воронке."}</p></div>}
    {archivedInquiries.length > 0 && <details className="archive-section"><summary>Архив заявок · {archivedInquiries.length}</summary><div className="cloud-inquiry-list">{archivedInquiries.map(inquiry => <InquiryCard key={inquiry.id} inquiry={inquiry} clientName={clientNames.get(inquiry.client_id) ?? "Клиент"} canWrite={canWrite} notes={notesByInquiry.get(inquiry.id)} currentUserId={currentUserId} today={today}/>)}</div></details>}
  </>;
}
