"use server";
import { revalidatePath } from "next/cache";
import { ATTACHMENT_BUCKET, attachmentIdSchema, attachmentMetadataSchema, validAttachmentBytes } from "@/lib/cloud/attachment-input";
import type { AttachmentState } from "@/lib/cloud/attachment-state";
import { attachmentContext } from "@/lib/server/attachment-context";
const failure = (message: string): AttachmentState => ({ status: "error", message });

export async function listInquiryAttachments(inquiryId: string): Promise<AttachmentState> {
  if (!attachmentIdSchema.safeParse(inquiryId).success) return failure("Некорректная заявка.");
  const ctx = await attachmentContext(false);
  if ("error" in ctx) return failure(ctx.error!);
  const { data, error } = await ctx.supabase.from("inquiry_attachments")
    .select("id,filename,size_bytes,created_at,state").eq("workspace_id", ctx.membership.workspace_id)
    .eq("inquiry_id", inquiryId).neq("state", "removed").order("created_at", { ascending: false }).limit(20);
  if (error) return failure("Файлы недоступны. Проверьте применение миграции вложений.");
  return { status: "success", files: (data ?? []).filter(file => ctx.membership.role !== "viewer" || file.state === "ready") };
}
export async function uploadInquiryAttachment(_state: AttachmentState, form: FormData): Promise<AttachmentState> {
  const inquiryId = attachmentIdSchema.safeParse(form.get("inquiryId"));
  const file = form.get("file");
  if (!inquiryId.success || !(file instanceof File)) return failure("Выберите заявку и файл.");
  const metadata = attachmentMetadataSchema.safeParse({ filename: file.name, contentType: file.type, size: file.size });
  if (!metadata.success) return failure("Выберите PDF, TXT, PNG или JPEG до 2 МиБ; имя — до 120 символов.");
  const ctx = await attachmentContext(true);
  if ("error" in ctx) return failure(ctx.error!);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validAttachmentBytes(metadata.data.filename, metadata.data.contentType, bytes)) return failure("Содержимое файла не соответствует формату.");
  const wid = ctx.membership.workspace_id;
  const { data: aid, error: reserveError } = await ctx.supabase.rpc("reserve_inquiry_attachment", {
    wid, iid: inquiryId.data, file_name: metadata.data.filename, mime_type: metadata.data.contentType, file_size: metadata.data.size,
  });
  if (reserveError || !aid) return failure("Загрузка недоступна: проверьте активность заявки и лимит 20 файлов.");
  const path = `${wid}/${inquiryId.data}/${aid}`;
  const { error: uploadError } = await ctx.supabase.storage.from(ATTACHMENT_BUCKET).upload(path, bytes, { contentType: metadata.data.contentType, upsert: false });
  if (uploadError) {
    revalidatePath("/app");
    return failure("Файл не загружен. Обновите список и удалите незавершённую загрузку перед повтором.");
  }
  const { error: finishError } = await ctx.supabase.rpc("finish_inquiry_attachment", { wid, aid, operation: "ready" });
  revalidatePath("/app");
  if (finishError) return failure("Загрузка не завершена. Обновите список; удалите незавершённый файл и повторите.");
  return { status: "success", message: "Файл добавлен." };
}
export async function removeInquiryAttachment(_state: AttachmentState, form: FormData): Promise<AttachmentState> {
  const id = attachmentIdSchema.safeParse(form.get("attachmentId"));
  if (!id.success) return failure("Некорректный файл.");
  const ctx = await attachmentContext(true);
  if ("error" in ctx) return failure(ctx.error!);
  const wid = ctx.membership.workspace_id;
  const { data: file, error } = await ctx.supabase.from("inquiry_attachments").select("id,object_path")
    .eq("id", id.data).eq("workspace_id", wid).maybeSingle();
  if (error || !file) return failure("Файл уже удалён или недоступен.");
  const { error: beginError } = await ctx.supabase.rpc("finish_inquiry_attachment", { wid, aid: id.data, operation: "deleting" });
  if (beginError) return failure("Удаление недоступно.");
  const { error: deleteError } = await ctx.supabase.storage.from(ATTACHMENT_BUCKET).remove([file.object_path]);
  if (deleteError) { revalidatePath("/app"); return failure("Удаление не завершено. Повторите удаление для очистки файла."); }
  const { error: finishError } = await ctx.supabase.rpc("finish_inquiry_attachment", { wid, aid: id.data, operation: "removed" });
  revalidatePath("/app");
  if (finishError) return failure("Повторите удаление для завершения очистки.");
  return { status: "success", message: "Файл удалён." };
}
