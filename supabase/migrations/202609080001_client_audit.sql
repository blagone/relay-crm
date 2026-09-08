-- Audit the complete client lifecycle. The existing client_guard trigger owns
-- version increments and immutable-field checks; this AFTER trigger records only
-- writes that successfully passed those guards.
create function public.audit_client_write() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  act public.audit_action := 'updated';
  fields text[] := array[]::text[];
begin
  if tg_op = 'INSERT' then
    act := 'created';
    fields := array['name','company','email','phone'];
  else
    if old.archived_at is null and new.archived_at is not null then
      act := 'archived';
      fields := array_append(fields,'archived_at');
    elsif old.archived_at is not null and new.archived_at is null then
      act := 'restored';
      fields := array_append(fields,'archived_at');
    end if;
    if new.name is distinct from old.name then fields := array_append(fields,'name'); end if;
    if new.company is distinct from old.company then fields := array_append(fields,'company'); end if;
    if new.email is distinct from old.email then fields := array_append(fields,'email'); end if;
    if new.phone is distinct from old.phone then fields := array_append(fields,'phone'); end if;
  end if;

  insert into public.audit_events(workspace_id,actor_id,action,entity_type,entity_id,metadata)
  values(new.workspace_id,auth.uid(),act,'client',new.id,jsonb_build_object('changed_fields',to_jsonb(fields)));
  return null;
end $$;

revoke all on function public.audit_client_write() from public;
create trigger client_write_audit after insert or update on public.clients
for each row execute function public.audit_client_write();
