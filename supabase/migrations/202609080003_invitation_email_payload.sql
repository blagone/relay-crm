-- Narrow authenticated projection used by the invitation mail Edge Function.
-- It only reveals a just-created pending invitation to the owner who created it.
begin;
create function public.get_invitation_email_payload(invitation_id uuid)
returns table(email text,workspace_name text,role public.member_role,expires_at timestamptz)
language sql volatile security definer set search_path='' as $$
  select i.email,w.name,i.role,i.expires_at
  from public.team_invitations i
  join public.workspaces w on w.id=i.workspace_id
  where i.id=invitation_id
    and i.invited_by=auth.uid()
    and i.status='pending'
    and i.expires_at>now()
    and i.created_at>=now()-interval '10 minutes'
    and exists(
      select 1 from public.memberships m
      where m.workspace_id=i.workspace_id and m.user_id=auth.uid() and m.role='owner'
    )
  limit 1
$$;
revoke all on function public.get_invitation_email_payload(uuid) from public,anon,authenticated;
grant execute on function public.get_invitation_email_payload(uuid) to authenticated;
commit;
