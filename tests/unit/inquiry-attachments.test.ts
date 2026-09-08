import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { attachmentMetadataSchema, validAttachmentBytes, MAX_ATTACHMENT_BYTES } from "../../src/lib/cloud/attachment-input";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn(), download: vi.fn(), eq: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => {
  const query = { select: () => query, eq: (...args: unknown[]) => { mocks.eq(...args); return query; }, order: () => query, limit: () => query, maybeSingle: mocks.maybeSingle };
  return { auth: { getUser: mocks.getUser }, from: () => query, rpc: mocks.rpc, storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, download: mocks.download }) } };
} }));
import { uploadInquiryAttachment, removeInquiryAttachment } from "../../src/app/actions/attachments";
import { GET } from "../../src/app/app/attachments/[id]/route";
const wid = "11111111-1111-4111-8111-111111111111";
const iid = "22222222-2222-4222-8222-222222222222";
const aid = "33333333-3333-4333-8333-333333333333";
const initial = { status: "idle" } as const;
const form = () => { const data = new FormData(); data.set("inquiryId", iid); data.set("workspace_id", "forged"); data.set("file", new File(["test document"], "brief.txt", { type: "text/plain" })); return data; };
const removeForm = () => { const data = new FormData(); data.set("attachmentId", aid); data.set("object_path", "forged"); return data; };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: { workspace_id: wid, role: "owner" }, error: null });
  mocks.rpc.mockResolvedValue({ data: aid, error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.download.mockResolvedValue({ data: new Blob(["test document"]), error: null });
});
describe("inquiry attachment boundary", () => {
  it("rejects empty, oversized, executable, path and control-character filenames", () => {
    const good = { filename: "brief.txt", contentType: "text/plain", size: 5 };
    expect(attachmentMetadataSchema.safeParse(good).success).toBe(true);
    for (const extra of [{ size: 0 }, { size: MAX_ATTACHMENT_BYTES + 1 }, { contentType: "text/html" }, { filename: "../brief.txt" }, { filename: "a\\b.txt" }, { filename: "a\nb.txt" }]) expect(attachmentMetadataSchema.safeParse({ ...good, ...extra }).success).toBe(false);
  });
  it("checks actual signatures and rejects corrupt UTF-8 or misleading extensions", () => {
    const text = new TextEncoder();
    expect(validAttachmentBytes("a.pdf", "application/pdf", text.encode("%PDF-1.7"))).toBe(true);
    expect(validAttachmentBytes("a.pdf", "application/pdf", text.encode("<script>"))).toBe(false);
    expect(validAttachmentBytes("a.html", "text/plain", text.encode("hi"))).toBe(false);
    expect(validAttachmentBytes("a.txt", "text/plain", new Uint8Array([0]))).toBe(false);
    expect(validAttachmentBytes("a.txt", "text/plain", new Uint8Array([0xff]))).toBe(false);
    expect(validAttachmentBytes("a.png", "image/png", new Uint8Array([137,80,78,71,13,10,26,10]))).toBe(true);
    expect(validAttachmentBytes("a.jpg", "image/jpeg", new Uint8Array([255,216,255]))).toBe(true);
  });
  it("derives tenant and upload path from fresh membership + reserved ID, never form fields", async () => {
    expect((await uploadInquiryAttachment(initial, form())).status).toBe("success");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.rpc).toHaveBeenCalledWith("reserve_inquiry_attachment", { wid, iid, file_name: "brief.txt", mime_type: "text/plain", file_size: 13 });
    expect(mocks.upload).toHaveBeenCalledWith(`${wid}/${iid}/${aid}`, expect.any(Uint8Array), { contentType: "text/plain", upsert: false });
    expect(mocks.rpc).toHaveBeenCalledWith("finish_inquiry_attachment", { wid, aid, operation: "ready" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app");
  });
  it("denies stale auth before any upload", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect((await uploadInquiryAttachment(initial, form())).status).toBe("error");
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("denies viewers upload and deletion", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { workspace_id: wid, role: "viewer" }, error: null });
    expect((await uploadInquiryAttachment(initial, form())).status).toBe("error");
    expect((await removeInquiryAttachment(initial, removeForm())).status).toBe("error");
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not upload when database rejects foreign/archived inquiry or quota", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "active inquiry required" } });
    expect((await uploadInquiryAttachment(initial, form())).status).toBe("error");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("leaves uncertain uploads pending and offers explicit cleanup", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "timeout" } });
    const result = await uploadInquiryAttachment(initial, form());
    expect(result.status).toBe("error"); expect(result.message).toContain("незавершённую");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("reports finalize failures, never claiming file saved", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: aid, error: null }).mockResolvedValueOnce({ error: { message: "mismatch" } });
    expect((await uploadInquiryAttachment(initial, form())).status).toBe("error");
  });
  it("removes only the database path, hiding object before API deletion and auditing after", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { workspace_id: wid, role: "manager" } }).mockResolvedValueOnce({ data: { id: aid, object_path: "database-path" } });
    expect((await removeInquiryAttachment(initial, removeForm())).status).toBe("success");
    expect(mocks.eq).toHaveBeenCalledWith("workspace_id", wid);
    expect(mocks.remove).toHaveBeenCalledWith(["database-path"]);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "finish_inquiry_attachment", { wid, aid, operation: "deleting" });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "finish_inquiry_attachment", { wid, aid, operation: "removed" });
  });
  it("preserves deletion recovery if Storage fails", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { workspace_id: wid, role: "owner" } }).mockResolvedValueOnce({ data: { id: aid, object_path: "database-path" } });
    mocks.remove.mockResolvedValue({ error: { message: "outage" } });
    expect((await removeInquiryAttachment(initial, removeForm())).status).toBe("error");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("forces download with private no-store, no sniffing and UTF-8 filename", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { workspace_id: wid, role: "viewer" } }).mockResolvedValueOnce({ data: { filename: "Бриф.txt", object_path: "database-path" } });
    const response = await GET(new Request("https://example.com"), { params: Promise.resolve({ id: aid }) });
    expect(response.status).toBe(200); expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(mocks.eq).toHaveBeenCalledWith("state", "ready");
    expect(await response.text()).toBe("test document");
  });
  it("denies foreign/deleted downloads without querying Storage", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { workspace_id: wid, role: "viewer" } }).mockResolvedValueOnce({ data: null });
    expect((await GET(new Request("https://example.com"), { params: Promise.resolve({ id: aid }) })).status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("migration establishes private RLS + no client metadata mutation + guarded state transitions", () => {
    const sql = readFileSync("supabase/migrations/202609080005_inquiry_attachments.sql", "utf8");
    expect(sql).toContain("'inquiry-attachments',false,2097152");
    expect(sql).toContain("foreign key(workspace_id,inquiry_id)");
    expect(sql).toContain("alter table public.inquiry_attachments enable row level security");
    expect(sql).toContain("revoke all on public.inquiry_attachments from anon,authenticated");
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(sql).toContain("attachment.uploaded_by=auth.uid()");
    expect(sql).toContain("for share"); expect(sql).toContain("for update");
    expect(sql).toContain("remove object through storage API first");
    expect(sql).toContain("metadata->>'mimetype'=attachment.content_type");
    expect(sql).toContain("attachment_added"); expect(sql).toContain("attachment_removed");
  });
});
