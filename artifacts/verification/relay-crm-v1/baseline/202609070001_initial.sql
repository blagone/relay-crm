-- Relay CRM initial additive schema. Rehearse on a disposable Supabase project.
create extension if not exists pgcrypto;
create type public.member_role as enum ('owner','manager','viewer');
create type public.inquiry_source as enum ('website','telegram','referral','other');
create type public.inquiry_status as enum ('new','contacted','proposal','won','lost');
create type public.audit_action as enum ('created','updated','status_changed','archived','restored','note_added');
create table public.workspaces (id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80), currency text not null default 'RUB' check(currency='RUB'), created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table public.memberships (workspace_id uuid not null references public.workspaces(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role public.member_role not null, created_at timestamptz not null default now(), primary key(workspace_id,user_id));
create table public.clients (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), name text not null check(length(trim(name)) between 1 and 120), company text not null default '' check(length(company)<=160), email text check(email is null or length(email)<=254), phone text check(phone is null or length(phone)<=40), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, version integer not null default 1 check(version>0), unique(workspace_id,id));
create table public.inquiries (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), client_id uuid not null, title text not null check(length(trim(title)) between 1 and 160), description text not null default '' check(length(description)<=5000), source public.inquiry_source not null, status public.inquiry_status not null default 'new', amount_minor bigint not null default 0 check(amount_minor between 0 and 100000000000), assignee_id uuid, next_contact_on date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), closed_at timestamptz, archived_at timestamptz, version integer not null default 1 check(version>0), unique(workspace_id,id), foreign key(workspace_id,client_id) references public.clients(workspace_id,id), foreign key(workspace_id,assignee_id) references public.memberships(workspace_id,user_id));
create table public.notes (id uuid primary key default gen_random_uuid(), workspace_id uuid not null, inquiry_id uuid not null, author_id uuid not null references auth.users(id), body text not null check(length(trim(body)) between 1 and 4000), created_at timestamptz not null default now(), unique(workspace_id,id), foreign key(workspace_id,inquiry_id) references public.inquiries(workspace_id,id));
create table public.audit_events (id bigint generated always as identity primary key, workspace_id uuid not null references public.workspaces(id), inquiry_id uuid, actor_id uuid, action public.audit_action not null, entity_type text not null check(entity_type in ('client','inquiry','note','workspace')), entity_id uuid not null, metadata jsonb not null default '{}', created_at timestamptz not null default now(), foreign key(workspace_id,inquiry_id) references public.inquiries(workspace_id,id), check(jsonb_typeof(metadata)='object' and metadata - array['changed_fields','from_status','to_status'] = '{}'::jsonb));
create index memberships_user_workspace on public.memberships(user_id,workspace_id); create index inquiries_pipeline on public.inquiries(workspace_id,status,updated_at desc,id); create index inquiries_contact on public.inquiries(workspace_id,next_contact_on); create index clients_name on public.clients(workspace_id,name); create index notes_inquiry on public.notes(workspace_id,inquiry_id,created_at); create index audit_recent on public.audit_events(workspace_id,created_at desc,id);

create function public.is_workspace_member(wid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=auth.uid()) $$;
create function public.can_write_workspace(wid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.memberships m where m.workspace_id=wid and m.user_id=auth.uid() and m.role in ('owner','manager')) $$;
revoke all on function public.is_workspace_member(uuid) from public; revoke all on function public.can_write_workspace(uuid) from public; grant execute on function public.is_workspace_member(uuid),public.can_write_workspace(uuid) to authenticated;

alter table public.workspaces enable row level security; alter table public.memberships enable row level security; alter table public.clients enable row level security; alter table public.inquiries enable row level security; alter table public.notes enable row level security; alter table public.audit_events enable row level security;
create policy workspace_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy memberships_read on public.memberships for select to authenticated using(public.is_workspace_member(workspace_id));
create policy clients_read on public.clients for select to authenticated using(public.is_workspace_member(workspace_id)); create policy clients_write on public.clients for all to authenticated using(public.can_write_workspace(workspace_id)) with check(public.can_write_workspace(workspace_id));
create policy inquiries_read on public.inquiries for select to authenticated using(public.is_workspace_member(workspace_id)); create policy inquiries_write on public.inquiries for all to authenticated using(public.can_write_workspace(workspace_id)) with check(public.can_write_workspace(workspace_id));
create policy notes_read on public.notes for select to authenticated using(public.is_workspace_member(workspace_id)); create policy notes_insert on public.notes for insert to authenticated with check(public.can_write_workspace(workspace_id) and author_id=auth.uid());
create policy audit_read on public.audit_events for select to authenticated using(public.is_workspace_member(workspace_id));
revoke insert,update,delete on public.audit_events from authenticated,anon; revoke update,delete on public.notes from authenticated,anon;

create function public.audit_inquiry_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare act public.audit_action; fields text[] := array[]::text[];
begin
  if tg_op='INSERT' then act:='created';
  else
    if new.workspace_id<>old.workspace_id then raise exception 'workspace is immutable'; end if;
    if new.status<>old.status then
      if not ((old.status='new' and new.status in ('contacted','lost')) or (old.status='contacted' and new.status in ('proposal','lost')) or (old.status='proposal' and new.status in ('won','lost')) or (old.status in ('won','lost') and new.status='contacted')) then raise exception 'invalid status transition'; end if;
      act:='status_changed'; fields:=array_append(fields,'status');
    elsif old.archived_at is null and new.archived_at is not null then act:='archived'; fields:=array_append(fields,'archived_at');
    elsif old.archived_at is not null and new.archived_at is null then act:='restored'; fields:=array_append(fields,'archived_at');
    else act:='updated'; end if;
    if new.title<>old.title then fields:=array_append(fields,'title'); end if;
    if new.amount_minor<>old.amount_minor then fields:=array_append(fields,'amount_minor'); end if;
    if new.next_contact_on is distinct from old.next_contact_on then fields:=array_append(fields,'next_contact_on'); end if;
    new.updated_at:=now(); new.version:=old.version+1;
    if new.status in ('won','lost') then new.closed_at:=coalesce(new.closed_at,now()); elsif old.status in ('won','lost') then new.closed_at:=null; end if;
  end if;
  insert into public.audit_events(workspace_id,inquiry_id,actor_id,action,entity_type,entity_id,metadata) values(new.workspace_id,new.id,auth.uid(),act,'inquiry',new.id,jsonb_build_object('changed_fields',to_jsonb(fields),'from_status',case when tg_op='UPDATE' then old.status::text end,'to_status',new.status::text));
  return new;
end $$;
revoke all on function public.audit_inquiry_change() from public;
create trigger inquiry_audit before insert or update on public.inquiries for each row execute function public.audit_inquiry_change();

create function public.audit_note_insert() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin insert into public.audit_events(workspace_id,inquiry_id,actor_id,action,entity_type,entity_id,metadata) values(new.workspace_id,new.inquiry_id,auth.uid(),'note_added','note',new.id,'{}'); return new; end $$;
revoke all on function public.audit_note_insert() from public;
create trigger note_audit after insert on public.notes for each row execute function public.audit_note_insert();

create function public.bootstrap_workspace(workspace_name text) returns uuid language plpgsql security definer set search_path=public,auth,pg_temp as $$ declare uid uuid:=auth.uid(); wid uuid; begin if uid is null then raise exception 'authentication required'; end if; if length(trim(workspace_name)) not between 1 and 80 then raise exception 'invalid workspace name'; end if; insert into public.workspaces(name,created_by) values(trim(workspace_name),uid) returning id into wid; insert into public.memberships(workspace_id,user_id,role) values(wid,uid,'owner'); return wid; end $$;
revoke all on function public.bootstrap_workspace(text) from public; grant execute on function public.bootstrap_workspace(text) to authenticated;
