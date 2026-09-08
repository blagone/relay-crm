import { attachmentContext } from "@/lib/server/attachment-context";
import { ATTACHMENT_BUCKET, attachmentIdSchema } from "@/lib/cloud/attachment-input";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () => new Response("Файл недоступен", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!attachmentIdSchema.safeParse(id).success) return notFound();
  const ctx = await attachmentContext(false);
  if ("error" in ctx) return notFound();
  const { data: file, error } = await ctx.supabase.from("inquiry_attachments").select("filename,object_path,size_bytes")
    .eq("id", id).eq("workspace_id", ctx.membership.workspace_id).eq("state", "ready").maybeSingle();
  if (error || !file) return notFound();
  const { data, error: downloadError } = await ctx.supabase.storage.from(ATTACHMENT_BUCKET).download(file.object_path);
  if (downloadError || !data) return notFound();
  const encodedName = encodeURIComponent(file.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(data, { headers: {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
  } });
}
