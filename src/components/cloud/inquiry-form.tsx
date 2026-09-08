"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createCloudInquiry } from "@/app/actions/inquiries";
import { initialInquiryMutationState } from "@/lib/cloud/inquiry-state";
import type { Database } from "@/lib/supabase/database.types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="primary" disabled={pending}>{pending ? "Сохраняем…" : "Добавить заявку"}</button>;
}

export function InquiryForm({ clients }: { clients: Client[] }) {
  const [state, action] = useActionState(createCloudInquiry, initialInquiryMutationState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") formRef.current?.reset(); }, [state]);
  return <form ref={formRef} action={action} className="cloud-inquiry-form">
    <div className="form-row">
      <label>Клиент<select name="clientId" required defaultValue=""><option value="" disabled>Выберите клиента</option>{clients.map(client => <option value={client.id} key={client.id}>{client.name}{client.company ? ` · ${client.company}` : ""}</option>)}</select></label>
      <label>Название<input name="title" required minLength={1} maxLength={160}/></label>
    </div>
    <label>Описание<textarea name="description" maxLength={5000}/></label>
    <div className="form-row form-row-3">
      <label>Источник<select name="source" defaultValue="website"><option value="website">Сайт</option><option value="telegram">Telegram</option><option value="referral">Рекомендация</option><option value="other">Другое</option></select></label>
      <label>Сумма, ₽<input name="amount" inputMode="decimal" required defaultValue="0" pattern="[0-9]+([.,][0-9]{1,2})?"/></label>
      <label>Следующий контакт<input name="nextContactOn" type="date"/></label>
    </div>
    {state.message && <p className={state.status === "success" ? "form-success" : "form-error"} role="status">{state.message}</p>}
    <SubmitButton/>
  </form>;
}
