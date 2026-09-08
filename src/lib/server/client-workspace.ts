import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export async function authenticatedClientWorkspace(requireWrite: boolean) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Сессия истекла. Войдите снова.", status: 401 } as const;
  const { data: membership, error: membershipError } = await supabase.from("memberships")
    .select("workspace_id,role").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (membershipError || !membership) return { error: "Рабочее пространство не найдено.", status: 403 } as const;
  if (requireWrite && membership.role === "viewer") return { error: "Для импорта нужна роль владельца или менеджера.", status: 403 } as const;
  return { supabase, user, membership } as const;
}
