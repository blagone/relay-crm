import { MAX_CLIENT_EXPORT_ROWS, serializeClientCsv } from "@/lib/cloud/client-csv";
import { authenticatedClientWorkspace } from "@/lib/server/client-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await authenticatedClientWorkspace(false);
  if ("error" in context) return Response.json({ error: context.error }, { status: context.status });
  const { data, error } = await context.supabase.from("clients").select("name,company,email,phone")
    .eq("workspace_id", context.membership.workspace_id).is("archived_at", null).order("name").range(0, MAX_CLIENT_EXPORT_ROWS);
  if (error) return Response.json({ error: "Не удалось подготовить экспорт." }, { status: 500 });
  if (data.length > MAX_CLIENT_EXPORT_ROWS) return Response.json({ error: `Экспорт ограничен ${MAX_CLIENT_EXPORT_ROWS} клиентами.` }, { status: 413 });
  return new Response(serializeClientCsv(data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relay-clients.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
