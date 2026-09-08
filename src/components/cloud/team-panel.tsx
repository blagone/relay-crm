"use client";
import { useActionState, type ReactNode } from "react";
import { inviteTeamMember, acceptTeamInvitation, revokeTeamInvitation, changeTeamMemberRole, removeTeamMember } from "@/app/actions/team";
import { initialTeamState, type TeamState } from "@/lib/cloud/team-state";
import type { TeamInvitation, TeamMember } from "@/lib/server/team-queries";
const roleLabels = { owner: "Владелец", manager: "Менеджер", viewer: "Наблюдатель" };
type Action = (state: TeamState, form: FormData) => Promise<TeamState>;
function TeamForm({ action, children, submit, confirm }: { action: Action; children?: ReactNode; submit: string; confirm?: string }) {
  const [state, formAction, pending] = useActionState(action, initialTeamState);
  return <form action={formAction} className="cloud-client-form" onSubmit={event => { if (confirm && !window.confirm(confirm)) event.preventDefault(); }}>
    {children}<button className="secondary" disabled={pending}>{pending ? "Сохраняем…" : submit}</button>
    {state.message && <p className={state.status === "success" ? "form-success" : "form-error"} role="status">{state.message}</p>}
  </form>;
}
function RoleSelect({ value = "viewer" }: { value?: "manager" | "viewer" }) {
  return <label>Роль<select name="role" defaultValue={value}><option value="viewer">Наблюдатель — только чтение</option><option value="manager">Менеджер — работа с клиентами и заявками</option></select></label>;
}
export function TeamPanel({ members, invitations, workspaceId, owner }: { members: TeamMember[]; invitations: TeamInvitation[]; workspaceId?: string; owner: boolean }) {
  const outgoing = owner ? invitations.filter(invite => invite.workspace_id === workspaceId) : [];
  const incoming = invitations.filter(invite => invite.workspace_id !== workspaceId);
  return <>
    <section className="panel"><h2>Как присоединиться</h2><p>Один аккаунт работает в одном пространстве. Коллега получает письмо, регистрируется с приглашённой почтой, подтверждает её и открывает <strong>/app/team</strong>, не создавая собственное пространство. Приглашение действует 7 дней.</p><p>Владелец управляет доступом, менеджер изменяет CRM, наблюдатель только читает. Передача владения в этом этапе не поддерживается.</p></section>
    <section className="panel"><h2>Входящие приглашения</h2>
      {!incoming.length && <p>Действующих входящих приглашений нет.</p>}
      {incoming.map(invite => <article key={invite.id}><h3>{invite.workspace_name}</h3><p>{roleLabels[invite.role]} · {invite.email} · до {new Date(invite.expires_at).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}</p>
        {workspaceId ? <p>Этот аккаунт уже состоит в пространстве. Для вступления используйте приглашённый аккаунт без пространства.</p> : <TeamForm action={acceptTeamInvitation} submit="Принять приглашение"><input type="hidden" name="invitationId" value={invite.id}/></TeamForm>}
      </article>)}
    </section>
    {owner && <>
      <section className="panel"><h2>Пригласить коллегу</h2><TeamForm action={inviteTeamMember} submit="Создать приглашение"><label>Почта коллеги<input type="email" name="email" required maxLength={254}/></label><RoleSelect/></TeamForm></section>
      <section className="panel"><h2>Ожидают принятия</h2>{!outgoing.length && <p>Нет действующих приглашений.</p>}{outgoing.map(invite => <article key={invite.id}><p>{invite.email} · {roleLabels[invite.role]} · до {new Date(invite.expires_at).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}</p><TeamForm action={revokeTeamInvitation} submit="Отозвать приглашение" confirm="Отозвать это приглашение?"><input type="hidden" name="invitationId" value={invite.id}/></TeamForm></article>)}</section>
      <section className="panel"><h2>Участники · {members.length}</h2>{members.map(member => <article key={member.user_id}><h3>{member.email}</h3><p>{roleLabels[member.role]}</p>{member.role !== "owner" && <>
        <TeamForm key={`${member.user_id}-${member.role}`} action={changeTeamMemberRole} submit="Сохранить роль"><input type="hidden" name="memberId" value={member.user_id}/><input type="hidden" name="expectedRole" value={member.role}/><RoleSelect value={member.role}/></TeamForm>
        <TeamForm action={removeTeamMember} submit="Отозвать доступ" confirm="Участник потеряет доступ. Его назначения в заявках будут очищены. Продолжить?"><input type="hidden" name="memberId" value={member.user_id}/><input type="hidden" name="expectedRole" value={member.role}/></TeamForm>
      </>}</article>)}</section>
    </>}
    {workspaceId && !owner && <section className="panel"><p>Управление участниками доступно владельцу вашего пространства.</p></section>}
  </>;
}
