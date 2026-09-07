import { z } from "zod";

export const statuses = ["new", "contacted", "proposal", "won", "lost"] as const;
export type InquiryStatus = (typeof statuses)[number];
export type Client = { id: string; name: string; company: string; email: string; phone: string; archivedAt: string | null };
export type Inquiry = { id: string; clientId: string; title: string; description: string; source: "website" | "telegram" | "referral" | "other"; status: InquiryStatus; amountMinor: number; nextContactOn: string | null; archivedAt: string | null; updatedAt: string; version: number };
export type Note = { id: string; inquiryId: string; body: string; createdAt: string };
export type AuditEvent = { id: string; inquiryId: string | null; action: string; summary: string; createdAt: string };
export type DemoState = { version: 1; clients: Client[]; inquiries: Inquiry[]; notes: Note[]; audit: AuditEvent[] };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Некорректная дата");
export const clientSchema = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(120), company: z.string().trim().max(160), email: z.union([z.literal(""), z.email().max(254)]), phone: z.string().max(40), archivedAt: z.string().nullable() });
export const inquirySchema = z.object({ id: z.string().min(1), clientId: z.string().min(1), title: z.string().trim().min(1).max(160), description: z.string().max(5000), source: z.enum(["website", "telegram", "referral", "other"]), status: z.enum(statuses), amountMinor: z.number().int().min(0).max(100_000_000_000), nextContactOn: isoDate.nullable(), archivedAt: z.string().nullable(), updatedAt: z.string(), version: z.number().int().positive() });
export const demoStateSchema = z.object({ version: z.literal(1), clients: z.array(clientSchema).max(250), inquiries: z.array(inquirySchema).max(500), notes: z.array(z.object({ id: z.string(), inquiryId: z.string(), body: z.string().trim().min(1).max(4000), createdAt: z.string() })).max(1000), audit: z.array(z.object({ id: z.string(), inquiryId: z.string().nullable(), action: z.string().max(80), summary: z.string().max(300), createdAt: z.string() })).max(2000) });

export const allowedTransitions: Record<InquiryStatus, InquiryStatus[]> = { new: ["contacted", "lost"], contacted: ["proposal", "lost"], proposal: ["won", "lost"], won: ["contacted"], lost: ["contacted"] };
export const canTransition = (from: InquiryStatus, to: InquiryStatus) => allowedTransitions[from].includes(to);
export const money = (minor: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(minor / 100);
export function metrics(state: DemoState) {
  const active = state.inquiries.filter((item) => !item.archivedAt);
  return { active: active.filter((item) => !["won", "lost"].includes(item.status)).length, pipeline: active.filter((item) => !["won", "lost"].includes(item.status)).reduce((sum, item) => sum + item.amountMinor, 0), won: active.filter((item) => item.status === "won").reduce((sum, item) => sum + item.amountMinor, 0), overdue: active.filter((item) => item.nextContactOn && item.nextContactOn < new Date().toISOString().slice(0, 10) && !["won", "lost"].includes(item.status)).length };
}
