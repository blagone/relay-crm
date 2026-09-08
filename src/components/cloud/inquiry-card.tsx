"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  archiveCloudInquiry,
  restoreCloudInquiry,
  transitionCloudInquiry,
  updateCloudInquiry,
} from "@/app/actions/inquiries";
import { allowedTransitions, money, type InquiryStatus } from "@/lib/domain";
import { initialInquiryMutationState } from "@/lib/cloud/inquiry-state";
import type { Database } from "@/lib/supabase/database.types";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
const statusLabel: Record<InquiryStatus, string> = { new: "Новая", contacted: "Связались", proposal: "Предложение", won: "Выиграна", lost: "Проиграна" };

function MutationButton({ children, kind = "primary" }: { children: string; kind?: "primary" | "danger" | "secondary" }) {
  const { pending } = useFormStatus();
  return <button className={kind} disabled={pending}>{pending ? "Сохраняем…" : children}</button>;
}

export function InquiryCard({ inquiry, clientName, canWrite }: { inquiry: Inquiry; clientName: string; canWrite: boolean }) {
  const archived = inquiry.archived_at !== null;
  const [editState, editAction] = useActionState(updateCloudInquiry, initialInquiryMutationState);
  const [transitionState, transitionAction] = useActionState(transitionCloudInquiry, initialInquiryMutationState);
  const [lifecycleState, lifecycleAction] = useActionState(archived ? restoreCloudInquiry : archiveCloudInquiry, initialInquiryMutationState);
  return <article className={`cloud-inquiry-card${archived ? " archived" : ""}`}>
    <details>
      <summary><span><strong>{inquiry.title}</strong><small>{clientName}</small></span><span className={`status ${inquiry.status}`}>{statusLabel[inquiry.status]}</span><b>{money(inquiry.amount_minor)}</b></summary>
      <div className="inquiry-detail">
        <p>{inquiry.description || "Описание не добавлено."}</p>
        <dl><dt>Источник</dt><dd>{inquiry.source}</dd><dt>Следующий контакт</dt><dd>{inquiry.next_contact_on ? new Date(`${inquiry.next_contact_on}T00:00:00`).toLocaleDateString("ru-RU") : "—"}</dd><dt>Обновлена</dt><dd>{new Date(inquiry.updated_at).toLocaleString("ru-RU")}</dd></dl>
        {canWrite && !archived && <>
          <form action={editAction} className="cloud-inquiry-edit">
            <input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/>
            <label>Название<input name="title" required minLength={1} maxLength={160} defaultValue={inquiry.title}/></label>
            <label>Описание<textarea name="description" maxLength={5000} defaultValue={inquiry.description}/></label>
            <div className="form-row form-row-3">
              <label>Источник<select name="source" defaultValue={inquiry.source}><option value="website">Сайт</option><option value="telegram">Telegram</option><option value="referral">Рекомендация</option><option value="other">Другое</option></select></label>
              <label>Сумма, ₽<input name="amount" inputMode="decimal" required defaultValue={(inquiry.amount_minor / 100).toFixed(2)} pattern="[0-9]+([.,][0-9]{1,2})?"/></label>
              <label>Следующий контакт<input name="nextContactOn" type="date" defaultValue={inquiry.next_contact_on ?? ""}/></label>
            </div>
            {editState.message && <p className={editState.status === "success" ? "form-success" : "form-error"} role="status">{editState.message}</p>}
            <MutationButton>Сохранить изменения</MutationButton>
          </form>
          <div className="inquiry-transitions"><span>Следующий статус</span>{allowedTransitions[inquiry.status].map(status => <form action={transitionAction} key={status}><input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/><input type="hidden" name="status" value={status}/><MutationButton kind="secondary">{statusLabel[status]}</MutationButton></form>)}</div>
          {transitionState.message && <p className={transitionState.status === "success" ? "form-success" : "form-error"} role="status">{transitionState.message}</p>}
        </>}
        {canWrite && <form action={lifecycleAction} className="inquiry-lifecycle-form"><input type="hidden" name="inquiryId" value={inquiry.id}/><input type="hidden" name="version" value={inquiry.version}/>{lifecycleState.message && <p className={lifecycleState.status === "success" ? "form-success" : "form-error"} role="status">{lifecycleState.message}</p>}<MutationButton kind={archived ? "secondary" : "danger"}>{archived ? "Восстановить" : "Архивировать"}</MutationButton></form>}
      </div>
    </details>
  </article>;
}
