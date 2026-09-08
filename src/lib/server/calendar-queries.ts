import "server-only";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";
import type { WorkspaceMember } from "@/lib/server/queries";

type Tables = Database["public"]["Tables"];
export type ContactCalendarDTO = {
  workspace: Tables["workspaces"]["Row"];
  role: Tables["memberships"]["Row"]["role"];
  members: WorkspaceMember[];
  inquiries: Tables["inquiries"]["Row"][];
};

export async function readContactCalendar(userId: string, first: string, last: string): Promise<ContactCalendarDTO | null> {
  const supabase = await createServerSupabase();
  const { data: membership, error } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", userId).limit(1).maybeSingle();
  if (error || !membership) return null;
  const workspaceId = membership.workspace_id;
  const [workspace, members, inquiries] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.rpc("list_workspace_members", { wid: workspaceId }),
    supabase.from("inquiries").select("*").eq("workspace_id", workspaceId).is("archived_at", null).gte("next_contact_on", first).lte("next_contact_on", last).order("next_contact_on").limit(1000),
  ]);
  if (workspace.error || !workspace.data || members.error || inquiries.error) throw new Error("Не удалось загрузить календарь контактов");
  return { workspace: workspace.data, role: membership.role, members: members.data ?? [], inquiries: inquiries.data ?? [] };
}
