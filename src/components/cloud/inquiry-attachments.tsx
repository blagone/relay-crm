"use client";
import { useState, useTransition } from "react";
import { listInquiryAttachments, removeInquiryAttachment, uploadInquiryAttachment } from "@/app/actions/attachments";
import { initialAttachmentState, type AttachmentState, type AttachmentItem } from "@/lib/cloud/attachment-state";
import { MAX_ATTACHMENT_BYTES } from "@/lib/cloud/attachment-input";
export function InquiryAttachments({ inquiryId, canWrite, archived }: { inquiryId: string; canWrite: boolean; archived: boolean }) {
  const [files, setFiles] = useState<AttachmentItem[] | null>(null);
  const [state, setState] = useState<AttachmentState>(initialAttachmentState);
  const [pending, startTransition] = useTransition();
  const refresh = async () => {
    const result = await listInquiryAttachments(inquiryId);
    if (result.files) setFiles(result.files);
    else { setFiles(null); setState(result); }
  };
  const run = (work: () => Promise<void>) => startTransition(async () => {
    try { await work(); } catch { setState({ status: "error", message: "Соединение прервалось. Обновите список перед повтором." }); }
  });
  return <section className="cloud-notes" aria-label="Файлы заявки">
    <h3>Файлы и документы</h3>
    <p>PDF, TXT, PNG, JPEG · до 2 МиБ · до 20 файлов. Документы Word/Excel сохраните в PDF.</p>
    <button className="secondary" type="button" disabled={pending} onClick={() => run(refresh)}>{pending ? "Загрузка…" : files ? "Обновить файлы" : "Показать файлы"}</button>
    {files?.length === 0 && <p>Файлов пока нет.</p>}
    {files?.map(file => <article key={file.id}>
      {file.state === "ready" ? <a className="text-link" href={`/app/attachments/${file.id}`}>{file.filename}</a> : <strong>{file.filename} · незавершённая операция</strong>}
      <small> · {Math.ceil(file.size_bytes / 1024)} КиБ · {new Date(file.created_at).toLocaleString("ru-RU")}</small>
      {canWrite && <button className="danger" type="button" disabled={pending} onClick={() => {
        if (!window.confirm(`Удалить файл «${file.filename}» без возможности восстановления?`)) return;
        run(async () => { const form = new FormData(); form.set("attachmentId", file.id); setState(await removeInquiryAttachment(initialAttachmentState, form)); await refresh(); });
      }}>{file.state === "ready" ? "Удалить файл" : "Очистить незавершённый файл"}</button>}
    </article>)}
    {canWrite && !archived && <form onSubmit={event => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const file = form.get("file");
      if (!(file instanceof File) || !file.size || file.size > MAX_ATTACHMENT_BYTES) { setState({ status: "error", message: "Выберите непустой файл до 2 МиБ." }); return; }
      run(async () => { const result = await uploadInquiryAttachment(initialAttachmentState, form); setState(result); if (result.status === "success") formElement.reset(); await refresh(); });
    }}>
      <input name="inquiryId" type="hidden" value={inquiryId}/>
      <label>Прикрепить файл<input type="file" name="file" accept=".pdf,.txt,.png,.jpg,.jpeg" required disabled={pending}/></label>
      <button className="primary" disabled={pending}>{pending ? "Загрузка…" : "Загрузить файл"}</button>
    </form>}
    {state.message && <p className={state.status === "error" ? "form-error" : "form-success"} role="status">{state.message}</p>}
  </section>;
}
