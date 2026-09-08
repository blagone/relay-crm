-- Non-destructive rollback: disable attachment access, preserve all blobs/metadata/audit.
-- Redeploy the previous application revision first. No storage.objects rows are deleted.
begin;
drop policy if exists inquiry_files_read on storage.objects;
drop policy if exists inquiry_files_upload on storage.objects;
drop policy if exists inquiry_files_delete on storage.objects;
revoke all on public.inquiry_attachments from anon,authenticated;
revoke execute on function public.reserve_inquiry_attachment(uuid,uuid,text,text,integer),public.can_upload_inquiry_attachment(text),public.finish_inquiry_attachment(uuid,uuid,text) from authenticated;
commit;
