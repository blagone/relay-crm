"use server";

import { revalidatePath } from "next/cache";
import { createClientSchema } from "@/lib/cloud/client-input";
import { createServerSupabase } from "@/lib/supabase/server";

export type CreateClientState = { status: "idle" | "success" | "error"; message?: string };
export const initialCreateClientState: CreateClientState = { status: "idle" };

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

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Сессия истекла. Войдите снова." };

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) {
    return { status: "error", message: "Рабочее пространство не найдено." };
  }
  if (membership.role === "viewer") {
    return { status: "error", message: "Для создания клиента нужна роль владельца или менеджера." };
  }

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
