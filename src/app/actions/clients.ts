"use server";

import { revalidatePath } from "next/cache";
import { clientLifecycleSchema, createClientSchema, updateClientSchema } from "@/lib/cloud/client-input";
import type { ClientMutationState, CreateClientState } from "@/lib/cloud/client-state";
import { duplicateClientMatches } from "@/lib/cloud/client-duplicates";
import { createServerSupabase } from "@/lib/supabase/server";

async function authenticatedWorkspace() {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Сессия истекла. Войдите снова." } as const;
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) return { error: "Рабочее пространство не найдено." } as const;
  if (membership.role === "viewer") return { error: "Для изменения клиента нужна роль владельца или менеджера." } as const;
  return { supabase, membership } as const;
}

export async function createCloudClient(
  _previousState: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Проверьте данные клиента" };
  }

  const context = await authenticatedWorkspace();
  if ("error" in context) return { status: "error", message: context.error };
  const { supabase, membership } = context;

  const duplicateError = await clientDuplicateError(supabase, membership.workspace_id, parsed.data);
  if (duplicateError) return { status: "error", message: duplicateError };
  const { error: insertError } = await supabase.from("clients").insert({
    workspace_id: membership.workspace_id,
    name: parsed.data.name,
    company: parsed.data.company,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
  });
  if (insertError) return { status: "error", message: "Не удалось сохранить клиента. Повторите позже." };

  revalidatePath("/app");
  return { status: "success", message: "Клиент сохранён." };
}

export async function updateCloudClient(
  _previousState: ClientMutationState,
  formData: FormData,
): Promise<ClientMutationState> {
  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"), version: formData.get("version"),
    name: formData.get("name"), company: formData.get("company"),
    email: formData.get("email"), phone: formData.get("phone"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Проверьте данные клиента" };
  const context = await authenticatedWorkspace();
  if ("error" in context) return { status: "error", message: context.error };
  const { clientId, version, ...fields } = parsed.data;
  const duplicateError = await clientDuplicateError(context.supabase, context.membership.workspace_id, fields, clientId);
  if (duplicateError) return { status: "error", message: duplicateError };
  const { data, error } = await context.supabase.from("clients").update({
    ...fields, email: fields.email || null, phone: fields.phone || null,
  }).eq("id", clientId).eq("workspace_id", context.membership.workspace_id)
    .eq("version", version).is("archived_at", null).select("id").maybeSingle();
  if (error || !data) return { status: "error", message: "Клиент уже изменён или недоступен. Обновите страницу." };
  revalidatePath("/app");
  return { status: "success", message: "Изменения сохранены." };
}

async function setClientArchived(formData: FormData, archived: boolean): Promise<ClientMutationState> {
  const parsed = clientLifecycleSchema.safeParse({ clientId: formData.get("clientId"), version: formData.get("version") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Проверьте данные клиента" };
  const context = await authenticatedWorkspace();
  if ("error" in context) return { status: "error", message: context.error };
  let query = context.supabase.from("clients").update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsed.data.clientId).eq("workspace_id", context.membership.workspace_id).eq("version", parsed.data.version);
  query = archived ? query.is("archived_at", null) : query.not("archived_at", "is", null);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return { status: "error", message: "Клиент уже изменён или недоступен. Обновите страницу." };
  revalidatePath("/app");
  return { status: "success", message: archived ? "Клиент перемещён в архив." : "Клиент восстановлен." };
}

export async function archiveCloudClient(_state: ClientMutationState, formData: FormData) {
  return setClientArchived(formData, true);
}

export async function restoreCloudClient(_state: ClientMutationState, formData: FormData) {
  return setClientArchived(formData, false);
}

async function clientDuplicateError(supabase: Awaited<ReturnType<typeof createServerSupabase>>, workspaceId: string, candidate: { email: string; phone: string }, excludeId?: string) {
  if (!candidate.email && !candidate.phone) return null;
  const { data, error } = await supabase.from("clients").select("id,name,email,phone").eq("workspace_id", workspaceId).is("archived_at", null).limit(1000);
  if (error) return "Не удалось проверить дубликаты клиента. Повторите позже.";
  const duplicates = duplicateClientMatches(data ?? [], candidate, excludeId);
  return duplicates.length ? `Похожий клиент уже есть: ${duplicates.slice(0, 2).map(item => item.name).join(", ")}. Проверьте почту или телефон.` : null;
}
