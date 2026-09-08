import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceMember } from "@/lib/server/queries";

type Tables = Database["public"]["Tables"];
export type ReportWorkspaceDTO = {
  workspace: Tables["workspaces"]["Row"];
  role: Tables["memberships"]["Row"]["role"];
  members: WorkspaceMember[];
  inquiries: Tables["inquiries"]["Row"][];
};

export async function readReportWorkspace(userId: string): Promise<ReportWorkspaceDTO | null> {
  const supabase = await createServerSupabase();
  const { data: membership, error } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", userId).limit(1).maybeSingle();
  if (error || !membership) return null;
  const workspaceId = membership.workspace_id;
  const [workspace, members, inquiries] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.rpc("list_workspace_members", { wid: workspaceId }),
    supabase.from("inquiries").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(5000),
  ]);
  if (workspace.error || !workspace.data || members.error || inquiries.error) throw new Error("Не удалось загрузить отчёты");
  return { workspace: workspace.data, role: membership.role, members: members.data ?? [], inquiries: inquiries.data ?? [] };
}

