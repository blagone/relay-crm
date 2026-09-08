import { z } from "zod";
import { allowedTransitions, statuses, type InquiryStatus } from "../domain";

export const inquirySources = ["website", "telegram", "referral", "other"] as const;

const optionalDate = z.string().trim().refine(
  (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
  "Укажите корректную дату",
);

const amountMinor = z.string().trim().refine(
  (value) => /^(?:0|[1-9]\d{0,9})(?:[.,]\d{1,2})?$/.test(value),
  "Укажите сумму от 0 до 1 000 000 000",
).transform((value) => Math.round(Number(value.replace(",", ".")) * 100)).refine(
  (value) => Number.isSafeInteger(value) && value <= 100_000_000_000,
  "Укажите сумму от 0 до 1 000 000 000",
);

const inquiryFields = z.object({
  clientId: z.uuid("Выберите клиента"),
  title: z.string().trim().min(1, "Укажите название заявки").max(160, "Название слишком длинное"),
  description: z.string().trim().max(5000, "Описание слишком длинное"),
  source: z.enum(inquirySources, "Выберите источник"),
  amountMinor,
  nextContactOn: optionalDate,
  assigneeId: z.union([z.literal(""), z.uuid("Выберите участника команды")]).default("").transform((value) => value || null),
});

const inquiryIdentity = z.object({
  inquiryId: z.uuid("Некорректный идентификатор заявки"),
  version: z.coerce.number().int().positive("Некорректная версия заявки"),
});

export const createInquirySchema = inquiryFields;
export const updateInquirySchema = inquiryFields.omit({ clientId: true }).extend(inquiryIdentity.shape);
export const inquiryLifecycleSchema = inquiryIdentity;
export const inquiryTransitionSchema = inquiryIdentity.extend({ status: z.enum(statuses) });
export const inquiryContactSchema = inquiryIdentity.extend({ nextContactOn: optionalDate.refine(Boolean, "Укажите дату контакта") });
export const createInquiryNoteSchema = z.object({
  inquiryId: z.uuid("Некорректный идентификатор заявки"),
  body: z.string().trim().min(1, "Введите текст заметки").max(4000, "Заметка слишком длинная"),
});

export function isAllowedInquiryTransition(from: InquiryStatus, to: InquiryStatus) {
  return allowedTransitions[from].includes(to);
}

