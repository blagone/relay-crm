import { demoStateSchema, type AuditEvent, type DemoState } from "./domain";

export const STORAGE_KEY = "relay-crm-demo-v1";
const now = "2026-09-07T12:00:00.000Z";
export const seed: DemoState = { version: 1, clients: [
  { id: "c1", name: "Мария Волкова", company: "Mellow Studio", email: "maria@example.test", phone: "+7 900 000-00-01", archivedAt: null },
  { id: "c2", name: "Илья Орлов", company: "North Lab", email: "ilya@example.test", phone: "+7 900 000-00-02", archivedAt: null },
  { id: "c3", name: "Анна Ким", company: "Сфера", email: "anna@example.test", phone: "+7 900 000-00-03", archivedAt: null },
], inquiries: [
  { id: "i1", clientId: "c1", title: "Лендинг для запуска курса", description: "Нужен выразительный одностраничник к октябрю.", source: "telegram", status: "proposal", amountMinor: 18500000, nextContactOn: "2026-09-09", archivedAt: null, updatedAt: now, version: 2 },
  { id: "i2", clientId: "c2", title: "Редизайн кабинета", description: "Аудит UX и новый интерфейс аналитики.", source: "referral", status: "contacted", amountMinor: 32000000, nextContactOn: "2026-09-08", archivedAt: null, updatedAt: now, version: 1 },
  { id: "i3", clientId: "c3", title: "Сайт кофейни", description: "Меню и история бренда.", source: "website", status: "won", amountMinor: 14500000, nextContactOn: null, archivedAt: null, updatedAt: now, version: 4 },
  { id: "i4", clientId: "c1", title: "Промо-страница события", description: "Проект отложен клиентом.", source: "other", status: "lost", amountMinor: 9000000, nextContactOn: null, archivedAt: now, updatedAt: now, version: 2 },
], notes: [{ id: "n1", inquiryId: "i1", body: "Отправили структуру и два направления по стилю.", createdAt: now }], audit: [
  { id: "a1", inquiryId: "i1", action: "status_changed", summary: "Заявка переведена в «Предложение»", createdAt: now },
  { id: "a2", inquiryId: "i3", action: "status_changed", summary: "Сделка успешно завершена", createdAt: now },
] };

export type LoadResult = { state: DemoState; warning?: string };
export function loadDemo(storage: Pick<Storage, "getItem">): LoadResult {
  try { const raw = storage.getItem(STORAGE_KEY); if (!raw) return { state: structuredClone(seed) }; const parsed = demoStateSchema.safeParse(JSON.parse(raw)); return parsed.success ? { state: parsed.data } : { state: structuredClone(seed), warning: "Сохранённые данные повреждены. Загружен безопасный пример." }; }
  catch { return { state: structuredClone(seed), warning: "Хранилище браузера недоступно. Изменения останутся только до обновления страницы." }; }
}
export function saveDemo(storage: Pick<Storage, "setItem">, state: DemoState): string | undefined {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(demoStateSchema.parse(state))); } catch { return "Не удалось сохранить изменения в этом браузере."; }
}
export const event = (action: string, summary: string, inquiryId: string | null = null): AuditEvent => ({ id: crypto.randomUUID(), inquiryId, action, summary, createdAt: new Date().toISOString() });
