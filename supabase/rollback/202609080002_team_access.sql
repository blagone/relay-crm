-- Deploy the previous application version first. Accepted memberships and audit history remain intact.
-- Pending invitations are retained in a private table for a forward recovery; no data is deleted.
begin;
drop function public.list_team_members(uuid);
drop function public.list_team_invitations();
drop function public.invite_team_member(uuid,text,public.member_role);
drop function public.accept_team_invitation(uuid);
drop function public.revoke_team_invitation(uuid,uuid);
drop function public.change_team_member_role(uuid,uuid,public.member_role,public.member_role);
drop function public.remove_team_member(uuid,uuid,public.member_role);
drop function public.require_team_owner(uuid);
-- Keep hardened single-workspace bootstrap: reverting it could create ambiguous membership selection.
-- Keep team_invitations RLS/no grants. To re-enable use the migration's CREATE FUNCTION statements,
-- excluding CREATE TABLE/INDEX and substituting CREATE OR REPLACE for bootstrap_workspace.
commit;
