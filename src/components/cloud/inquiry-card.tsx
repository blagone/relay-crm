"use client";

import { useActionState, useCallback, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { InquiryAttachments } from "@/components/cloud/inquiry-attachments";
import {
  archiveCloudInquiry,
  createCloudInquiryNote,
  rescheduleCloudInquiry,
  restoreCloudInquiry,
  transitionCloudInquiry,
  updateCloudInquiry,
} from "@/app/actions/inquiries";
import { allowedTransitions, money, type InquiryStatus } from "@/lib/domain";
import { initialInquiryMutationState } from "@/lib/cloud/inquiry-state";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceMember } from "@/lib/server/queries";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Note = Database["public"]["Tables"]["notes"]["Row"];
const statusLabel: Record<InquiryStatus, string> = { new: "Новая", contacted: "Связались", proposal: "Предложение", won: "Выиграна", lost: "Проиграна" };

function MutationButton({ children, kind = "primary" }: { children: string; kind?: "primary" | "danger" | "secondary" }) {
  const { pending } = useFormStatus();
  return <button className={kind} disabled={pending}>{pending ? "Сохраняем…" : children}</button>;
}

export function InquiryCard({ inquiry, clientName, canWrite, notes = [], currentUserId, today, members }: { inquiry: Inquiry; clientName: string; canWrite: boolean; notes?: Note[]; currentUserId: string; today: string; members: WorkspaceMember[] }) {
  const archived = inquiry.archived_at !== null;
  const open = !archived && inquiry.status !== "won" && inquiry.status !== "lost";
  const assigneeLabel = inquiry.assignee_id
    ? inquiry.assignee_id === currentUserId ? "Вы" : members.find(member => member.user_id === inquiry.assignee_id)?.email ?? "Участник"
    : "Не назначен";
  const contactLabel = inquiry.next_contact_on ? new Date(`${inquiry.next_contact_on}T00:00:00Z`).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", timeZone: "UTC" }) : "Контакт не назначен";
  const overdue = open && Boolean(inquiry.next_contact_on && inquiry.next_contact_on < today);
  const [editState, editAction] = useActionState(updateCloudInquiry, initialInquiryMutationState);
  const [transitionState, transitionAction] = useActionState(transitionCloudInquiry, initialInquiryMutationState);
  const [contactState, contactAction] = useActionState(rescheduleCloudInquiry, initialInquiryMutationState);
  const [noteState, noteAction] = useActionState(createCloudInquiryNote, initialInquiryMutationState);
  const [lifecycleState, lifecycleAction] = useActionState(archived ? restoreCloudInquiry : archiveCloudInquiry, initialInquiryMutationState);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hash = `inquiry-${inquiry.id}`;
  const openDrawer = useCallback(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    history.replaceState(null, "", `#${hash}`);
  }, [hash]);
  const closeDrawer = useCallback(() => dialogRef.current?.close(), []);
  const clearHash = useCallback(() => {
    if (window.location.hash === `#${hash}`) history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [hash]);
  useEffect(() => {
    const syncWithHash = () => {
      if (window.location.hash === `#${hash}`) {
        if (!dialogRef.current?.open) dialogRef.current?.showModal();
      } else if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
    };
    syncWithHash();
    window.addEventListener("hashchange", syncWithHash);
    return () => window.removeEventListener("hashchange", syncWithHash);
  }, [hash]);
  return <article id={`inquiry-${inquiry.id}`} className={`cloud-inquiry-card${archived ? " archived" : ""}`}>
    <button type="button" className="inquiry-card-trigger" onClick={openDrawer} aria-haspopup="dialog">
      <span className="inquiry-card-main"><strong>{inquiry.title}</strong><small>{clientName}</small>{open && <span className="inquiry-card-meta"><span title="Ответственный">{assigneeLabel}</span><span className="contact" title="Следующий контакт">{contactLabel}</span>{overdue && <span className="overdue">Просрочено</span>}</span>}</span><span className={`status ${inquiry.status}`}>{statusLabel[inquiry.status]}</span><b>{money(inquiry.amount_minor)}</b><span className="inquiry-open-icon" aria-hidden="true">→</span>
    </button>
    <dialog ref={dialogRef} className="inquiry-drawer" onClose={clearHash} onClick={event => { if (event.target === dialogRef.current) closeDrawer(); }} aria-labelledby={`${hash}-title`}>
      <div className="inquiry-drawer-sheet">
        <header className="inquiry-drawer-head"><div><small>{clientName}</small><h2 id={`${hash}-title`}>{inquiry.title}</h2><div><span className={`status ${inquiry.status}`}>{statusLabel[inquiry.status]}</span><strong>{money(inquiry.amount_minor)}</strong></div></div><button type="button" onClick={closeDrawer} className="drawer-close" aria-label="Закрыть карточку">×</button></header>
        <div className="inquiry-detail">
        <InquiryAttachments inquiryId={inquiry.id} canWrite={canWrite} archived={archived}/>
        <p>{inquiry.description || "Описание не добавлено."}</p>
        <dl><dt>Источник</dt><dd>{inquiry.source}</dd><dt>Ответственный</dt><dd>{assigneeLabel}</dd><dt>Следующий контакт</dt><dd>{inquiry.next_contact_on ? new Date(`${inquiry.next_contact_on}T00:00:00`).toLocaleDateString("ru-RU") : "—"}</dd><dt>Обновлена</dt><dd>{new Date(inquiry.updated_at).toLocaleString("ru-RU")}</dd></dl>
        {canWrite && !archived && <>
          <div className="inquiry-fast-actions" aria-label="Быстрые действия">
            {inquiry.status === "new" && <form action={transitionAction}><input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/><input type="hidden" name="status" value="contacted"/><MutationButton kind="secondary">Связались</MutationButton></form>}
            {[{ label: "Контакт завтра", date: tomorrow }, { label: "Перенести на 7 дней", date: nextWeek }].map(item => <form action={contactAction} key={item.date}><input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/><input type="hidden" name="nextContactOn" value={item.date}/><MutationButton kind="secondary">{item.label}</MutationButton></form>)}
          </div>
          {contactState.message && <p className={contactState.status === "success" ? "form-success" : "form-error"} role="status">{contactState.message}</p>}
          <form action={editAction} className="cloud-inquiry-edit">
            <input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/>
            <label>Название<input name="title" required minLength={1} maxLength={160} defaultValue={inquiry.title}/></label>
            <label>Описание<textarea name="description" maxLength={5000} defaultValue={inquiry.description}/></label>
            <div className="form-row form-row-3">
              <label>Источник<select name="source" defaultValue={inquiry.source}><option value="website">Сайт</option><option value="telegram">Telegram</option><option value="referral">Рекомендация</option><option value="other">Другое</option></select></label>
              <label>Сумма, ₽<input name="amount" inputMode="decimal" required defaultValue={(inquiry.amount_minor / 100).toFixed(2)} pattern="[0-9]+([.,][0-9]{1,2})?"/></label>
              <label>Следующий контакт<input name="nextContactOn" type="date" defaultValue={inquiry.next_contact_on ?? ""}/></label>
            </div>
            <label>Ответственный<select name="assigneeId" defaultValue={inquiry.assignee_id ?? ""}><option value="">Не назначен</option>{members.map(member => <option value={member.user_id} key={member.user_id}>{member.user_id === currentUserId ? "Я" : member.email} · {member.role}</option>)}</select></label>
            {editState.message && <p className={editState.status === "success" ? "form-success" : "form-error"} role="status">{editState.message}</p>}
            <MutationButton>Сохранить изменения</MutationButton>
          </form>
          <div className="inquiry-transitions"><span>Следующий статус</span>{allowedTransitions[inquiry.status].map(status => <form action={transitionAction} key={status}><input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/><input type="hidden" name="status" value={status}/><MutationButton kind="secondary">{statusLabel[status]}</MutationButton></form>)}</div>
          {transitionState.message && <p className={transitionState.status === "success" ? "form-success" : "form-error"} role="status">{transitionState.message}</p>}
          <section className="cloud-notes">
            <h3>Заметки · {notes.length}</h3>
            {notes.map(note => <article key={note.id}><p>{note.body}</p><small>{note.author_id === currentUserId ? "Вы" : `Участник ${note.author_id.slice(0, 8)}`} · {new Date(note.created_at).toLocaleString("ru-RU")}</small></article>)}
            {!notes.length && <p>Заметок пока нет.</p>}
            <form action={noteAction}><input type="hidden" name="inquiryId" value={inquiry.id}/><label>Новая заметка<textarea name="body" required minLength={1} maxLength={4000} placeholder="Итоги контакта и следующий шаг"/></label>{noteState.message && <p className={noteState.status === "success" ? "form-success" : "form-error"} role="status">{noteState.message}</p>}<MutationButton>Добавить заметку</MutationButton></form>
          </section>
        </>}
        {(archived || !canWrite) && notes.length > 0 && <section className="cloud-notes"><h3>Заметки · {notes.length}</h3>{notes.map(note => <article key={note.id}><p>{note.body}</p><small>{note.author_id === currentUserId ? "Вы" : `Участник ${note.author_id.slice(0, 8)}`} · {new Date(note.created_at).toLocaleString("ru-RU")}</small></article>)}</section>}
        {canWrite && <form action={lifecycleAction} className="inquiry-lifecycle-form" onSubmit={archived ? undefined : event => { if (!window.confirm(`Архивировать заявку «${inquiry.title}»?`)) event.preventDefault(); }}><input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/>{lifecycleState.message && <p className={lifecycleState.status === "success" ? "form-success" : "form-error"} role="status">{lifecycleState.message}</p>}<MutationButton kind={archived ? "secondary" : "danger"}>{archived ? "Восстановить" : "Архивировать"}</MutationButton></form>}
        </div>
      </div>
    </dialog>
  </article>;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
