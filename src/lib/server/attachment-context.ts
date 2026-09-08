import { createServerSupabase } from "@/lib/supabase/server";
export async function attachmentContext(write: boolean) {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Сессия истекла. Войдите снова." } as const;
  const { data: membership, error: memberError } = await supabase.from("memberships")
    .select("workspace_id,role").eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
  if (memberError || !membership) return { error: "Рабочее пространство не найдено." } as const;
  if (write && membership.role === "viewer") return { error: "Для изменения файлов нужна роль менеджера или владельца." } as const;
  return { supabase, membership } as const;
}
