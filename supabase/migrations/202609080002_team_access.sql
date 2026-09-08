-- Team access v1: one workspace per account; owner role cannot be delegated.
-- Transactional additive migration. No application service-role key is needed.
begin;
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check(email=lower(trim(email)) and length(email) between 3 and 254 and position('@' in email)>1),
  role public.member_role not null check(role in ('manager','viewer')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check(status in ('pending','accepted','revoked')),
  expires_at timestamptz not null default (now()+interval '7 days'),
  created_at timestamptz not null default now()
);
create unique index team_invitation_pending on public.team_invitations(workspace_id,email) where status='pending';
alter table public.team_invitations enable row level security;
-- No direct table privileges: every operation goes through a scoped RPC.
revoke all on public.team_invitations from public,anon,authenticated;

create function public.require_team_owner(wid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform 1 from public.workspaces w where w.id=wid for update;
  if not exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=auth.uid() and m.role='owner') then
    raise exception 'owner required';
  end if;
end $$;
revoke all on function public.require_team_owner(uuid) from public,anon,authenticated;

create function public.list_team_members(wid uuid)
returns table(user_id uuid,email text,role public.member_role,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  perform public.require_team_owner(wid);
  return query select m.user_id,u.email::text,m.role,m.created_at from public.memberships m
    join auth.users u on u.id=m.user_id where m.workspace_id=wid order by m.created_at,m.user_id;
end $$;

create function public.list_team_invitations()
returns table(id uuid,workspace_id uuid,workspace_name text,email text,role public.member_role,expires_at timestamptz)
language sql stable security definer set search_path='' as $$
  select i.id,i.workspace_id,w.name,i.email,i.role,i.expires_at
  from public.team_invitations i join public.workspaces w on w.id=i.workspace_id
  where i.status='pending' and i.expires_at>now() and (
    exists(select 1 from public.memberships m where m.workspace_id=i.workspace_id and m.user_id=auth.uid() and m.role='owner')
    or exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=i.email)
  ) order by i.created_at desc limit 100
$$;

create function public.invite_team_member(wid uuid,invite_email text,invite_role public.member_role)
returns uuid language plpgsql security definer set search_path='' as $$
declare iid uuid; normalized text:=lower(trim(invite_email));
begin
  perform public.require_team_owner(wid);
  if invite_role is null or invite_role not in ('manager','viewer') then raise exception 'invalid role'; end if;
  if normalized is null or length(normalized) not between 3 and 254 or position('@' in normalized)<2 then raise exception 'invalid email'; end if;
  if exists(select 1 from public.memberships m join auth.users u on u.id=m.user_id where m.workspace_id=wid and lower(u.email)=normalized) then raise exception 'already a member'; end if;
  update public.team_invitations set status='revoked' where workspace_id=wid and status='pending' and expires_at<=now();
  if (select count(*) from public.team_invitations where workspace_id=wid and status='pending')>=100 then raise exception 'invitation limit reached'; end if;
  insert into public.team_invitations(workspace_id,email,role,invited_by) values(wid,normalized,invite_role,auth.uid()) returning id into iid;
  insert into public.audit_events(workspace_id,actor_id,action,entity_type,entity_id,metadata)
    values(wid,auth.uid(),'updated','workspace',wid,'{"changed_fields":["team_invitation_created"]}');
  return iid;
end $$;

create function public.accept_team_invitation(invitation_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.team_invitations; uid uuid:=auth.uid(); confirmed_email text; wid uuid;
begin
  if uid is null then raise exception 'authentication required'; end if;
  select i.workspace_id into wid from public.team_invitations i where i.id=invitation_id;
  if wid is null then raise exception 'invitation unavailable'; end if;
  -- Serialize accept/revoke and all owner mutations within this workspace.
  perform 1 from public.workspaces w where w.id=wid for update;
  select i.* into invitation from public.team_invitations i where i.id=invitation_id for update;
  -- Shared lock order with bootstrap: lock the auth account before membership check.
  select lower(u.email) into confirmed_email from auth.users u where u.id=uid and u.email_confirmed_at is not null for update;
  if confirmed_email is null or invitation.email<>confirmed_email or invitation.status<>'pending' or invitation.expires_at<=now() then raise exception 'invitation unavailable'; end if;
  if exists(select 1 from public.memberships m where m.user_id=uid) then raise exception 'account already has a workspace'; end if;
  insert into public.memberships(workspace_id,user_id,role) values(wid,uid,invitation.role);
  update public.team_invitations set status='accepted' where id=invitation_id;
  insert into public.audit_events(workspace_id,actor_id,action,entity_type,entity_id,metadata)
    values(wid,uid,'updated','workspace',wid,'{"changed_fields":["team_member_added"]}');
  return wid;
end $$;

create function public.revoke_team_invitation(wid uuid,invitation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_team_owner(wid);
  update public.team_invitations set status='revoked' where id=invitation_id and workspace_id=wid and status='pending';
  if not found then raise exception 'invitation unavailable'; end if;
  insert into public.audit_events(workspace_id,actor_id,action,entity_type,entity_id,metadata)
    values(wid,auth.uid(),'updated','workspace',wid,'{"changed_fields":["team_invitation_revoked"]}');
end $$;

create function public.change_team_member_role(wid uuid,member_id uuid,expected_role public.member_role,new_role public.member_role)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_team_owner(wid);
  if new_role is null or new_role not in ('manager','viewer') then raise exception 'invalid role'; end if;
  update public.memberships set role=new_role where workspace_id=wid and user_id=member_id and role=expected_role and role<>'owner';
  if not found then raise exception 'member changed or unavailable'; end if;
  insert into public.audit_events(workspace_id,actor_id,action,entity_type,entity_id,metadata)
    values(wid,auth.uid(),'updated','workspace',wid,'{"changed_fields":["team_member_role"]}');
end $$;

create function public.remove_team_member(wid uuid,member_id uuid,expected_role public.member_role)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_team_owner(wid);
  if not exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=member_id and m.role=expected_role and m.role<>'owner') then raise exception 'member changed or unavailable'; end if;
  -- Clear assignment references, including archived inquiries, before FK-protected deletion.
  update public.inquiries set assignee_id=null where workspace_id=wid and assignee_id=member_id;
  delete from public.memberships where workspace_id=wid and user_id=member_id and role<>'owner';
  insert into public.audit_events(workspace_id,actor_id,action,entity_type,entity_id,metadata)
    values(wid,auth.uid(),'updated','workspace',wid,'{"changed_fields":["team_member_removed"]}');
end $$;

create or replace function public.bootstrap_workspace(workspace_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); wid uuid;
begin
  if uid is null then raise exception 'authentication required'; end if;
  perform 1 from auth.users u where u.id=uid and u.email_confirmed_at is not null for update;
  if not found then raise exception 'confirmed email required'; end if;
  if exists(select 1 from public.memberships m where m.user_id=uid) then raise exception 'account already has a workspace'; end if;
  if workspace_name is null or length(trim(workspace_name)) not between 1 and 80 then raise exception 'invalid workspace name'; end if;
  insert into public.workspaces(name,created_by) values(trim(workspace_name),uid) returning id into wid;
  insert into public.memberships(workspace_id,user_id,role) values(wid,uid,'owner');
  return wid;
exception when unique_violation then raise exception 'workspace already exists';
end $$;
revoke all on function public.list_team_members(uuid),public.list_team_invitations(),public.invite_team_member(uuid,text,public.member_role),public.accept_team_invitation(uuid),public.revoke_team_invitation(uuid,uuid),public.change_team_member_role(uuid,uuid,public.member_role,public.member_role),public.remove_team_member(uuid,uuid,public.member_role) from public,anon,authenticated;
grant execute on function public.list_team_members(uuid),public.list_team_invitations(),public.invite_team_member(uuid,text,public.member_role),public.accept_team_invitation(uuid),public.revoke_team_invitation(uuid,uuid),public.change_team_member_role(uuid,uuid,public.member_role,public.member_role),public.remove_team_member(uuid,uuid,public.member_role) to authenticated;
commit;
