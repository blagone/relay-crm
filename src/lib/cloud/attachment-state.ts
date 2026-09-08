export type AttachmentItem = {
  id: string; filename: string; size_bytes: number; created_at: string;
  state: "pending" | "ready" | "deleting" | "removed";
};
export type AttachmentState = { status: "idle" | "success" | "error"; message?: string; files?: AttachmentItem[] };
export const initialAttachmentState: AttachmentState = { status: "idle" };
