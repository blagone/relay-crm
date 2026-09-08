"use server";

import { revalidatePath } from "next/cache";
import { ClientCsvError, MAX_CLIENT_CSV_BYTES, parseClientCsv } from "@/lib/cloud/client-csv";
import type { ClientCsvImportState } from "@/lib/cloud/client-csv-state";
import { authenticatedClientWorkspace } from "@/lib/server/client-workspace";

export async function importClientCsv(_state: ClientCsvImportState, formData: FormData): Promise<ClientCsvImportState> {
  const value = formData.get("clientsCsv");
  if (!value || typeof value === "string" || typeof value.arrayBuffer !== "function") return { status: "error", message: "Выберите CSV-файл." };
  if (value.size === 0) return { status: "error", message: "CSV-файл пуст." };
  if (value.size > MAX_CLIENT_CSV_BYTES) return { status: "error", message: "CSV-файл больше 256 КБ." };

  let clients;
  try {
    const bytes = await value.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    clients = parseClientCsv(text);
  } catch (error) {
    return { status: "error", message: error instanceof ClientCsvError ? error.message : "CSV должен быть сохранён в UTF-8." };
  }

  const context = await authenticatedClientWorkspace(true);
  if ("error" in context) return { status: "error", message: context.error };
  const { error } = await context.supabase.from("clients").insert(clients.map(client => ({
    workspace_id: context.membership.workspace_id,
    name: client.name,
    company: client.company,
    email: client.email || null,
    phone: client.phone || null,
  })));
  if (error) return { status: "error", message: "Импорт не выполнен: ни один клиент не добавлен." };
  revalidatePath("/app");
  revalidatePath("/app/data");
  return { status: "success", message: `Импортировано клиентов: ${clients.length}.` };
}
