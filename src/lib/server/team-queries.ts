import "server-only";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabase } from "@/lib/supabase/server";
type Functions = Database["public"]["Functions"];
export type TeamMember = Functions["list_team_members"]["Returns"][number];
export type TeamInvitation = Functions["list_team_invitations"]["Returns"][number];
export async function readTeamData(userId: string) {
  const supabase = await createServerSupabase();
  const { data: membership, error: membershipError } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
  const invitations = await supabase.rpc("list_team_invitations", {});
  const members = membership?.role === "owner" ? await supabase.rpc("list_team_members", { wid: membership.workspace_id }) : { data: [], error: null };
  return { membership, invitations: invitations.data ?? [], members: members.data ?? [], unavailable: Boolean(membershipError || invitations.error || members.error) };
}
