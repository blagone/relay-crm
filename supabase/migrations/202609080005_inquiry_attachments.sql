-- Private inquiry files. Apply before application deployment.
begin;
create table public.inquiry_attachments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, inquiry_id uuid not null,
  uploaded_by uuid not null references auth.users(id),
  filename text not null check (length(filename) between 1 and 120 and filename !~ '[[:cntrl:]/\\]'),
  content_type text not null check (content_type in ('application/pdf','text/plain','image/png','image/jpeg')),
  size_bytes integer not null check (size_bytes between 1 and 2097152), object_path text not null unique,
  state text not null default 'pending' check (state in ('pending','ready','deleting','removed')),
  created_at timestamptz not null default now(),
  foreign key(workspace_id,inquiry_id) references public.inquiries(workspace_id,id)
);
create index attachments_inquiry on public.inquiry_attachments(workspace_id,inquiry_id,created_at);
alter table public.inquiry_attachments enable row level security;
revoke all on public.inquiry_attachments from anon,authenticated;
grant select on public.inquiry_attachments to authenticated;
create policy attachment_metadata_read on public.inquiry_attachments for select to authenticated
using (state <> 'removed' and public.is_workspace_member(workspace_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('inquiry-attachments','inquiry-attachments',false,2097152,array['application/pdf','text/plain','image/png','image/jpeg']);

create function public.reserve_inquiry_attachment(wid uuid, iid uuid, file_name text, mime_type text, file_size integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare aid uuid:=gen_random_uuid();
begin
  if auth.uid() is null or not public.can_write_workspace(wid) then raise exception 'write access required'; end if;
  -- Serialize allocation per inquiry; the cap includes unfinished uploads.
  perform 1 from public.inquiries where id=iid and workspace_id=wid and archived_at is null for update;
  if not found then raise exception 'active inquiry required'; end if;
  if (select count(*) from public.inquiry_attachments where workspace_id=wid and inquiry_id=iid and state<>'removed') >= 20 then raise exception 'attachment limit reached'; end if;
  insert into public.inquiry_attachments(id,workspace_id,inquiry_id,uploaded_by,filename,content_type,size_bytes,object_path)
  values(aid,wid,iid,auth.uid(),file_name,mime_type,file_size,wid::text||'/'||iid::text||'/'||aid::text);
  return aid;
end $$;

create function public.can_upload_inquiry_attachment(path text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare attachment public.inquiry_attachments;
begin
  -- Lock against deletion/finalization while Storage creates its metadata row.
  select * into attachment from public.inquiry_attachments where object_path=path for share;
  if not found then return false; end if;
  return attachment.state='pending' and attachment.uploaded_by=auth.uid()
    and public.can_write_workspace(attachment.workspace_id)
    and exists(select 1 from public.inquiries where id=attachment.inquiry_id and workspace_id=attachment.workspace_id and archived_at is null);
end $$;
create policy inquiry_files_read on storage.objects for select to authenticated using (
  bucket_id='inquiry-attachments' and exists(select 1 from public.inquiry_attachments a
    where a.object_path=name and (a.state='ready' or (a.state in ('pending','deleting') and public.can_write_workspace(a.workspace_id))))
);
create policy inquiry_files_upload on storage.objects for insert to authenticated with check (
  bucket_id='inquiry-attachments' and public.can_upload_inquiry_attachment(name)
);
create policy inquiry_files_delete on storage.objects for delete to authenticated using (
  bucket_id='inquiry-attachments' and exists(select 1 from public.inquiry_attachments a
    where a.object_path=name and a.state='deleting' and public.can_write_workspace(a.workspace_id))
);
-- No UPDATE policy: replacements/moves cannot bypass validation or audit.

create function public.finish_inquiry_attachment(wid uuid, aid uuid, operation text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare attachment public.inquiry_attachments; changed text;
begin
  if auth.uid() is null or not public.can_write_workspace(wid) then raise exception 'write access required'; end if;
  select * into attachment from public.inquiry_attachments where id=aid and workspace_id=wid for update;
  if not found then raise exception 'attachment unavailable'; end if;
  if operation='ready' then
    if attachment.state='ready' then return; end if;
    if attachment.state<>'pending' then raise exception 'invalid attachment state'; end if;
    if not exists(select 1 from public.inquiries where id=attachment.inquiry_id and workspace_id=wid and archived_at is null) then raise exception 'active inquiry required'; end if;
    if not exists(select 1 from storage.objects where bucket_id='inquiry-attachments' and name=attachment.object_path
      and (metadata->>'size')::bigint=attachment.size_bytes and metadata->>'mimetype'=attachment.content_type) then raise exception 'uploaded object mismatch'; end if;
    update public.inquiry_attachments set state='ready' where id=aid;
    changed:='attachment_added';
  elsif operation='deleting' then
    if attachment.state='removed' then return; end if;
    update public.inquiry_attachments set state='deleting' where id=aid;
    return;
  elsif operation='removed' then
    if attachment.state='removed' then return; end if;
    if attachment.state<>'deleting' then raise exception 'invalid attachment state'; end if;
    if exists(select 1 from storage.objects where bucket_id='inquiry-attachments' and name=attachment.object_path) then raise exception 'remove object through storage API first'; end if;
    update public.inquiry_attachments set state='removed' where id=aid;
    changed:='attachment_removed';
  else raise exception 'invalid operation';
  end if;
  insert into public.audit_events(workspace_id,inquiry_id,actor_id,action,entity_type,entity_id,metadata)
  values(wid,attachment.inquiry_id,auth.uid(),'updated','inquiry',attachment.inquiry_id,jsonb_build_object('changed_fields',jsonb_build_array(changed)));
end $$;
revoke all on function public.reserve_inquiry_attachment(uuid,uuid,text,text,integer),public.can_upload_inquiry_attachment(text),public.finish_inquiry_attachment(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_inquiry_attachment(uuid,uuid,text,text,integer),public.can_upload_inquiry_attachment(text),public.finish_inquiry_attachment(uuid,uuid,text) to authenticated;
commit;
