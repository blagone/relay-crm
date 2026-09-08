"use server";

import { revalidatePath } from "next/cache";
import {
  createInquiryNoteSchema,
  createInquirySchema,
  inquiryContactSchema,
  inquiryLifecycleSchema,
  inquiryTransitionSchema,
  isAllowedInquiryTransition,
  updateInquirySchema,
} from "@/lib/cloud/inquiry-input";
import type { InquiryMutationState } from "@/lib/cloud/inquiry-state";
import { createServerSupabase } from "@/lib/supabase/server";

async function writableWorkspace() {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Сессия истекла. Войдите снова." } as const;
  const { data: membership, error: membershipError } = await supabase.from("memberships")
    .select("workspace_id,user_id,role").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (membershipError || !membership) return { error: "Рабочее пространство не найдено." } as const;
  if (membership.role === "viewer") return { error: "Для изменения заявки нужна роль владельца или менеджера." } as const;
  return { supabase, membership } as const;
}

const errorState = (message: string): InquiryMutationState => ({ status: "error", message });

export async function createCloudInquiry(
  _state: InquiryMutationState,
  formData: FormData,
): Promise<InquiryMutationState> {
  const parsed = createInquirySchema.safeParse({
    clientId: formData.get("clientId"), title: formData.get("title"),
    description: formData.get("description"), source: formData.get("source"),
    amountMinor: formData.get("amount"), nextContactOn: formData.get("nextContactOn"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Проверьте данные заявки");
  const context = await writableWorkspace();
  if ("error" in context) return errorState(context.error ?? "Не удалось открыть рабочее пространство.");
  const { data: client, error: clientError } = await context.supabase.from("clients").select("id")
    .eq("id", parsed.data.clientId).eq("workspace_id", context.membership.workspace_id).is("archived_at", null).maybeSingle();
  if (clientError || !client) return errorState("Активный клиент не найден.");
  const { error } = await context.supabase.from("inquiries").insert({
    workspace_id: context.membership.workspace_id,
    client_id: client.id,
    title: parsed.data.title,
    description: parsed.data.description,
    source: parsed.data.source,
    amount_minor: parsed.data.amountMinor,
    next_contact_on: parsed.data.nextContactOn || null,
  });
  if (error) return errorState("Не удалось сохранить заявку. Повторите позже.");
  revalidatePath("/app");
  return { status: "success", message: "Заявка сохранена." };
}

export async function updateCloudInquiry(
  _state: InquiryMutationState,
  formData: FormData,
): Promise<InquiryMutationState> {
  const parsed = updateInquirySchema.safeParse({
    inquiryId: formData.get("inquiryId"), version: formData.get("version"),
    title: formData.get("title"), description: formData.get("description"),
    source: formData.get("source"), amountMinor: formData.get("amount"),
    nextContactOn: formData.get("nextContactOn"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Проверьте данные заявки");
  const context = await writableWorkspace();
  if ("error" in context) return errorState(context.error ?? "Не удалось открыть рабочее пространство.");
  const { inquiryId, version, ...fields } = parsed.data;
  const { data, error } = await context.supabase.from("inquiries").update({
    title: fields.title, description: fields.description, source: fields.source,
    amount_minor: fields.amountMinor, next_contact_on: fields.nextContactOn || null,
  }).eq("id", inquiryId).eq("workspace_id", context.membership.workspace_id)
    .eq("version", version).is("archived_at", null).select("id").maybeSingle();
  if (error || !data) return errorState("Заявка уже изменена или недоступна. Обновите страницу.");
  revalidatePath("/app");
  return { status: "success", message: "Изменения сохранены." };
}

export async function transitionCloudInquiry(
  _state: InquiryMutationState,
  formData: FormData,
): Promise<InquiryMutationState> {
  const parsed = inquiryTransitionSchema.safeParse({
    inquiryId: formData.get("inquiryId"), version: formData.get("version"), status: formData.get("status"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Проверьте новый статус");
  const context = await writableWorkspace();
  if ("error" in context) return errorState(context.error ?? "Не удалось открыть рабочее пространство.");
  const { data: inquiry, error: readError } = await context.supabase.from("inquiries").select("status,version")
    .eq("id", parsed.data.inquiryId).eq("workspace_id", context.membership.workspace_id)
    .is("archived_at", null).maybeSingle();
  if (readError || !inquiry || inquiry.version !== parsed.data.version) return errorState("Заявка уже изменена или недоступна. Обновите страницу.");
  if (!isAllowedInquiryTransition(inquiry.status, parsed.data.status)) return errorState("Этот переход статуса недоступен.");
  const { data, error } = await context.supabase.from("inquiries").update({ status: parsed.data.status })
    .eq("id", parsed.data.inquiryId).eq("workspace_id", context.membership.workspace_id)
    .eq("version", parsed.data.version).is("archived_at", null).select("id").maybeSingle();
  if (error || !data) return errorState("Заявка уже изменена или недоступна. Обновите страницу.");
  revalidatePath("/app");
  return { status: "success", message: "Статус обновлён." };
}

export async function rescheduleCloudInquiry(
  _state: InquiryMutationState,
  formData: FormData,
): Promise<InquiryMutationState> {
  const parsed = inquiryContactSchema.safeParse({
    inquiryId: formData.get("inquiryId"), version: formData.get("version"),
    nextContactOn: formData.get("nextContactOn"),
  });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Проверьте дату контакта");
  const context = await writableWorkspace();
  if ("error" in context) return errorState(context.error ?? "Не удалось открыть рабочее пространство.");
  const { data, error } = await context.supabase.from("inquiries").update({ next_contact_on: parsed.data.nextContactOn })
    .eq("id", parsed.data.inquiryId).eq("workspace_id", context.membership.workspace_id)
    .eq("version", parsed.data.version).is("archived_at", null).select("id").maybeSingle();
  if (error || !data) return errorState("Заявка уже изменена или недоступна. Обновите страницу.");
  revalidatePath("/app");
  return { status: "success", message: "Следующий контакт перенесён." };
}

export async function createCloudInquiryNote(
  _state: InquiryMutationState,
  formData: FormData,
): Promise<InquiryMutationState> {
  const parsed = createInquiryNoteSchema.safeParse({ inquiryId: formData.get("inquiryId"), body: formData.get("body") });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Проверьте заметку");
  const context = await writableWorkspace();
  if ("error" in context) return errorState(context.error ?? "Не удалось открыть рабочее пространство.");
  const { data: inquiry, error: inquiryError } = await context.supabase.from("inquiries").select("id")
    .eq("id", parsed.data.inquiryId).eq("workspace_id", context.membership.workspace_id).is("archived_at", null).maybeSingle();
  if (inquiryError || !inquiry) return errorState("Активная заявка не найдена.");
  const { error } = await context.supabase.from("notes").insert({
    workspace_id: context.membership.workspace_id,
    inquiry_id: inquiry.id,
    author_id: context.membership.user_id,
    body: parsed.data.body,
  });
  if (error) return errorState("Не удалось добавить заметку. Повторите позже.");
  revalidatePath("/app");
  return { status: "success", message: "Заметка добавлена." };
}

async function setInquiryArchived(formData: FormData, archived: boolean): Promise<InquiryMutationState> {
  const parsed = inquiryLifecycleSchema.safeParse({ inquiryId: formData.get("inquiryId"), version: formData.get("version") });
  if (!parsed.success) return errorState(parsed.error.issues[0]?.message ?? "Проверьте данные заявки");
  const context = await writableWorkspace();
  if ("error" in context) return errorState(context.error ?? "Не удалось открыть рабочее пространство.");
  let query = context.supabase.from("inquiries").update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsed.data.inquiryId).eq("workspace_id", context.membership.workspace_id).eq("version", parsed.data.version);
  query = archived ? query.is("archived_at", null) : query.not("archived_at", "is", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return errorState("Заявка уже изменена или недоступна. Обновите страницу.");
  revalidatePath("/app");
  return { status: "success", message: archived ? "Заявка перемещена в архив." : "Заявка восстановлена." };
}

export async function archiveCloudInquiry(_state: InquiryMutationState, formData: FormData) {
  return setInquiryArchived(formData, true);
}

export async function restoreCloudInquiry(_state: InquiryMutationState, formData: FormData) {
  return setInquiryArchived(formData, false);
}

