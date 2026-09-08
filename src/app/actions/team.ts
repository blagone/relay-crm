"use server";
import { revalidatePath } from "next/cache";
import { inviteTeamSchema, invitationIdentitySchema, memberIdentitySchema, memberRoleSchema } from "@/lib/cloud/team-input";
import type { TeamState } from "@/lib/cloud/team-state";
import { createServerSupabase } from "@/lib/supabase/server";

async function ownerContext() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Сессия истекла. Войдите снова." } as const;
  const { data: membership, error: membershipError } = await supabase.from("memberships").select("workspace_id,role").eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
  if (membershipError || !membership || membership.role !== "owner") return { error: "Управление командой доступно владельцу." } as const;
  return { supabase, membership } as const;
}
function result(error: unknown, message: string): TeamState {
  if (error) return { status: "error", message: "Изменение не выполнено. Обновите страницу: приглашение или участник могли измениться. Для вступления нужен аккаунт без рабочего пространства." };
  revalidatePath("/app");
  revalidatePath("/app/team");
  return { status: "success", message };
}
export async function inviteTeamMember(_state: TeamState, form: FormData): Promise<TeamState> {
  const parsed = inviteTeamSchema.safeParse({ email: form.get("email"), role: form.get("role") });
  if (!parsed.success) return { status: "error", message: "Проверьте почту и роль." };
  const context = await ownerContext();
  if ("error" in context) return { status: "error", message: context.error };
  const { error } = await context.supabase.rpc("invite_team_member", { wid: context.membership.workspace_id, invite_email: parsed.data.email, invite_role: parsed.data.role });
  return result(error, "Приглашение создано на 7 дней. Передайте коллеге ссылку /app/team — письмо автоматически не отправляется.");
}
export async function acceptTeamInvitation(_state: TeamState, form: FormData): Promise<TeamState> {
  const parsed = invitationIdentitySchema.safeParse({ invitationId: form.get("invitationId") });
  if (!parsed.success) return { status: "error", message: "Некорректное приглашение." };
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Войдите в аккаунт с подтверждённой почтой." };
  const { error } = await supabase.rpc("accept_team_invitation", { invitation_id: parsed.data.invitationId });
  return result(error, "Вы присоединились к команде. Откройте рабочее пространство.");
}
export async function revokeTeamInvitation(_state: TeamState, form: FormData): Promise<TeamState> {
  const parsed = invitationIdentitySchema.safeParse({ invitationId: form.get("invitationId") });
  if (!parsed.success) return { status: "error", message: "Некорректное приглашение." };
  const context = await ownerContext();
  if ("error" in context) return { status: "error", message: context.error };
  const { error } = await context.supabase.rpc("revoke_team_invitation", { wid: context.membership.workspace_id, invitation_id: parsed.data.invitationId });
  return result(error, "Приглашение отозвано.");
}
export async function changeTeamMemberRole(_state: TeamState, form: FormData): Promise<TeamState> {
  const parsed = memberRoleSchema.safeParse({ memberId: form.get("memberId"), expectedRole: form.get("expectedRole"), role: form.get("role") });
  if (!parsed.success) return { status: "error", message: "Проверьте участника и роль." };
  const context = await ownerContext();
  if ("error" in context) return { status: "error", message: context.error };
  const { error } = await context.supabase.rpc("change_team_member_role", { wid: context.membership.workspace_id, member_id: parsed.data.memberId, expected_role: parsed.data.expectedRole, new_role: parsed.data.role });
  return result(error, "Роль обновлена.");
}
export async function removeTeamMember(_state: TeamState, form: FormData): Promise<TeamState> {
  const parsed = memberIdentitySchema.safeParse({ memberId: form.get("memberId"), expectedRole: form.get("expectedRole") });
  if (!parsed.success) return { status: "error", message: "Проверьте участника." };
  const context = await ownerContext();
  if ("error" in context) return { status: "error", message: context.error };
  const { error } = await context.supabase.rpc("remove_team_member", { wid: context.membership.workspace_id, member_id: parsed.data.memberId, expected_role: parsed.data.expectedRole });
  return result(error, "Доступ отозван. Ответственный в заявках этого участника очищен.");
}
