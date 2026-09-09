"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { archiveCloudClient, restoreCloudClient, updateCloudClient } from "@/app/actions/clients";
import { initialClientMutationState } from "@/lib/cloud/client-state";
import { safeEmailHref, safePhoneHref } from "@/lib/cloud/contact-links";
import type { Database } from "@/lib/supabase/database.types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

function MutationButton({ children, kind = "primary" }: { children: string; kind?: "primary" | "danger" | "secondary" }) {
  const { pending } = useFormStatus();
  return <button className={kind} disabled={pending}>{pending ? "Сохраняем…" : children}</button>;
}

export function ClientCard({ client, canWrite }: { client: Client; canWrite: boolean }) {
  const archived = client.archived_at !== null;
  const phoneHref = safePhoneHref(client.phone);
  const emailHref = safeEmailHref(client.email);
  const [editState, editAction] = useActionState(updateCloudClient, initialClientMutationState);
  const [lifecycleState, lifecycleAction] = useActionState(archived ? restoreCloudClient : archiveCloudClient, initialClientMutationState);
  return <article className={`cloud-client-card${archived ? " archived" : ""}`}>
    <details>
      <summary><span><strong>{client.name}</strong><small>{client.company || "Без компании"}</small></span><b>{archived ? "В архиве" : "Открыть"}</b></summary>
      <div className="client-detail">
        <dl>
          <dt>Почта</dt><dd>{emailHref ? <a href={emailHref}>{client.email}</a> : "—"}</dd>
          <dt>Телефон</dt><dd>{phoneHref ? <a href={phoneHref}>{client.phone}</a> : client.phone || "—"}</dd>
          <dt>Обновлён</dt><dd>{new Date(client.updated_at).toLocaleString("ru-RU")}</dd>
        </dl>
        {(phoneHref || emailHref) && <div className="client-quick-actions" aria-label="Связаться с клиентом">
          {phoneHref && <a className="secondary" href={phoneHref}>Позвонить</a>}
          {emailHref && <a className="secondary" href={emailHref}>Написать</a>}
        </div>}
        {canWrite && !archived && <form action={editAction} className="cloud-client-edit">
          <input type="hidden" name="clientId" value={client.id}/><input type="hidden" name="version" value={client.version}/>
          <div className="form-row">
            <label>Имя<input name="name" required minLength={1} maxLength={120} defaultValue={client.name}/></label>
            <label>Компания<input name="company" maxLength={160} defaultValue={client.company}/></label>
          </div>
          <div className="form-row">
            <label>Почта<input name="email" type="email" maxLength={254} defaultValue={client.email ?? ""}/></label>
            <label>Телефон<input name="phone" type="tel" maxLength={40} defaultValue={client.phone ?? ""}/></label>
          </div>
          {editState.message && <p className={editState.status === "success" ? "form-success" : "form-error"} role="status">{editState.message}</p>}
          <MutationButton>Сохранить изменения</MutationButton>
        </form>}
        {canWrite && <form action={lifecycleAction} className="client-lifecycle-form" onSubmit={archived ? undefined : event => { if (!window.confirm(`Архивировать клиента «${client.name}»?`)) event.preventDefault(); }}>
          <input type="hidden" name="clientId" value={client.id}/><input type="hidden" name="version" value={client.version}/>
          {lifecycleState.message && <p className={lifecycleState.status === "success" ? "form-success" : "form-error"} role="status">{lifecycleState.message}</p>}
          <MutationButton kind={archived ? "secondary" : "danger"}>{archived ? "Восстановить" : "Архивировать"}</MutationButton>
        </form>}
      </div>
    </details>
  </article>;
}
