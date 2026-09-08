begin;
drop function if exists public.list_workspace_members(uuid);
create or replace function public.guard_and_audit_inquiry_update() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare act public.audit_action:='updated'; fields text[]:=array[]::text[];
begin
  if new.id<>old.id or new.workspace_id<>old.workspace_id or new.created_at<>old.created_at then raise exception 'immutable inquiry identity fields'; end if;
  if new.version<>old.version then raise exception 'stale inquiry version'; end if;
  if new.status<>old.status then
    if not ((old.status='new' and new.status in ('contacted','lost')) or (old.status='contacted' and new.status in ('proposal','lost')) or (old.status='proposal' and new.status in ('won','lost')) or (old.status in ('won','lost') and new.status='contacted')) then raise exception 'invalid status transition'; end if;
    act:='status_changed'; fields:=array_append(fields,'status');
  elsif old.archived_at is null and new.archived_at is not null then act:='archived'; fields:=array_append(fields,'archived_at');
  elsif old.archived_at is not null and new.archived_at is null then act:='restored'; fields:=array_append(fields,'archived_at');
  end if;
  if new.title<>old.title then fields:=array_append(fields,'title'); end if;
  if new.amount_minor<>old.amount_minor then fields:=array_append(fields,'amount_minor'); end if;
  if new.next_contact_on is distinct from old.next_contact_on then fields:=array_append(fields,'next_contact_on'); end if;
  new.updated_at:=now(); new.version:=old.version+1;
  if new.status in ('won','lost') then new.closed_at:=coalesce(old.closed_at,now()); else new.closed_at:=null; end if;
  insert into public.audit_events(workspace_id,inquiry_id,actor_id,action,entity_type,entity_id,metadata)
  values(new.workspace_id,new.id,auth.uid(),act,'inquiry',new.id,jsonb_build_object('changed_fields',to_jsonb(fields),'from_status',old.status::text,'to_status',new.status::text));
  return new;
end $$;
revoke all on function public.guard_and_audit_inquiry_update() from public;
commit;
