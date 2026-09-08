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
  const { data: invitationId, error } = await context.supabase.rpc("invite_team_member", { wid: context.membership.workspace_id, invite_email: parsed.data.email, invite_role: parsed.data.role });
  if (error || !invitationIdentitySchema.safeParse({ invitationId }).success) {
    return result(error ?? new Error("invalid invitation response"), "");
  }

  // The function receives only the database-issued id. It derives and authorizes
  // every mail field again under the caller's JWT; form values are never trusted.
  const delivery = await context.supabase.functions.invoke("send-team-invitation", {
    body: { invitationId },
  }).catch(() => ({ data: null, error: new Error("delivery unavailable") }));
  if (delivery.error || delivery.data?.ok !== true) {
    return result(null, "Приглашение создано на 7 дней, но письмо сейчас не доставлено. Отзовите приглашение и создайте его снова или передайте коллеге ссылку /app/team.");
  }
  return result(null, "Приглашение создано на 7 дней. Письмо отправлено коллеге.");
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
