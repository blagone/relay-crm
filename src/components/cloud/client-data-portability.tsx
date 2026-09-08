"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importClientCsv } from "@/app/actions/client-csv";
import { initialClientCsvImportState } from "@/lib/cloud/client-csv-state";

function ImportButton() {
  const { pending } = useFormStatus();
  return <button className="primary" disabled={pending}>{pending ? "Импортируем…" : "Импортировать клиентов"}</button>;
}

export function ClientDataPortability({ canWrite }: { canWrite: boolean }) {
  const [state, action] = useActionState(importClientCsv, initialClientCsvImportState);
  return <div className="data-grid">
    <section className="panel data-panel" aria-labelledby="export-heading">
      <div className="panel-head"><div><p className="eyebrow">UTF-8 CSV</p><h2 id="export-heading">Экспорт клиентов</h2></div></div>
      <p>Скачиваются только активные клиенты текущего рабочего пространства. Опасные для таблиц формулы нейтрализуются.</p>
      <a className="secondary" href="/app/data/clients.csv" download>Скачать CSV</a>
    </section>
    <section className="panel data-panel" aria-labelledby="import-heading">
      <div className="panel-head"><div><p className="eyebrow">ДО 500 СТРОК</p><h2 id="import-heading">Импорт клиентов</h2></div></div>
      <p>Колонки строго в порядке: <code>name,company,email,phone</code>. Допустимы запятая или точка с запятой, UTF-8 и файл до 256 КБ.</p>
      {canWrite ? <form action={action}>
        <label htmlFor="clientsCsv">CSV-файл</label>
        <input id="clientsCsv" name="clientsCsv" type="file" accept=".csv,text/csv" required />
        {state.message && <p className={state.status === "success" ? "form-success" : "form-error"} role="status" aria-live="polite">{state.message}</p>}
        <ImportButton />
      </form> : <p className="form-error">Наблюдатель может экспортировать данные, но не импортировать их.</p>}
    </section>
  </div>;
}
