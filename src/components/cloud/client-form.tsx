"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createCloudClient } from "@/app/actions/clients";
import { initialCreateClientState } from "@/lib/cloud/client-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="primary" disabled={pending}>{pending ? "Сохраняем…" : "Добавить клиента"}</button>;
}

export function ClientForm() {
  const [state, formAction] = useActionState(createCloudClient, initialCreateClientState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return <form ref={formRef} action={formAction} className="cloud-client-form">
    <div className="form-row">
      <label>Имя клиента<input name="name" required minLength={1} maxLength={120} autoComplete="name" /></label>
      <label>Компания<input name="company" maxLength={160} autoComplete="organization" /></label>
    </div>
    <div className="form-row">
      <label>Почта<input name="email" type="email" maxLength={254} autoComplete="email" /></label>
      <label>Телефон<input name="phone" type="tel" maxLength={40} autoComplete="tel" /></label>
    </div>
    {state.message && <p className={state.status === "success" ? "form-success" : "form-error"} role="status">{state.message}</p>}
    <SubmitButton />
  </form>;
}
