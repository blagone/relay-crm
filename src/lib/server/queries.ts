import "server-only";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";

type Tables = Database["public"]["Tables"];
export type WorkspaceMember = Database["public"]["Functions"]["list_workspace_members"]["Returns"][number];
export type CloudWorkspaceDTO = {
  currentUserId: string; workspace: Tables["workspaces"]["Row"]; role: Tables["memberships"]["Row"]["role"];
  members: WorkspaceMember[]; clients: Tables["clients"]["Row"][]; archivedClients: Tables["clients"]["Row"][];
  inquiries: Tables["inquiries"]["Row"][]; archivedInquiries: Tables["inquiries"]["Row"][];
  notes: Tables["notes"]["Row"][]; activity: Tables["audit_events"]["Row"][];
};

export async function readCloudWorkspace(userId: string): Promise<CloudWorkspaceDTO | null> {
  const supabase = await createServerSupabase();
  const { data: membership, error } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", userId).limit(1).maybeSingle();
  if (error || !membership) return null;
  const workspaceId = membership.workspace_id;
  const [workspace, members, clients, archivedClients, inquiries, archivedInquiries, notes, activity] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.rpc("list_workspace_members", { wid: workspaceId }),
    supabase.from("clients").select("*").eq("workspace_id", workspaceId).is("archived_at", null).order("name").limit(100),
    supabase.from("clients").select("*").eq("workspace_id", workspaceId).not("archived_at", "is", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("inquiries").select("*").eq("workspace_id", workspaceId).is("archived_at", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("inquiries").select("*").eq("workspace_id", workspaceId).not("archived_at", "is", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("notes").select("*").eq("workspace_id",workspaceId).order("created_at", { ascending: false }).limit(500),
    supabase.from("audit_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (workspace.error || !workspace.data || members.error) throw new Error("Не удалось загрузить рабочее пространство");
  return { currentUserId: userId, workspace: workspace.data, role: membership.role, members: members.data ?? [], clients: clients.data ?? [], archivedClients: archivedClients.data ?? [], inquiries: inquiries.data ?? [], archivedInquiries: archivedInquiries.data ?? [], notes: notes.data ?? [], activity: activity.data ?? [] };
}
