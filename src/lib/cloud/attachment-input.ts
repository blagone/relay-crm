import { z } from "zod";
export const ATTACHMENT_BUCKET = "inquiry-attachments";
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const attachmentIdSchema = z.string().uuid();
export const attachmentMetadataSchema = z.object({
  filename: z.string().trim().min(1).max(120).refine(value => !/[\u0000-\u001f\u007f/\\]/.test(value), "Некорректное имя файла"),
  contentType: z.enum(["application/pdf", "text/plain", "image/png", "image/jpeg"]),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
});
const extensions: Record<string, string[]> = {
  "application/pdf": ["pdf"], "text/plain": ["txt"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"],
};
// Signature checks detect format mismatches; not an antivirus scanner.
export function validAttachmentBytes(name: string, type: string, bytes: Uint8Array): boolean {
  if (!extensions[type]?.includes(name.split(".").pop()?.toLowerCase() ?? "")) return false;
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (type === "application/pdf") return starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (type === "image/png") return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/jpeg") return starts([0xff, 0xd8, 0xff]);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
  } catch { return false; }
}
