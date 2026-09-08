import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientDataPortability } from "@/components/cloud/client-data-portability";
import { authenticatedClientWorkspace } from "@/lib/server/client-workspace";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const context = await authenticatedClientWorkspace(false);
  if ("error" in context) redirect("/app");
  return <main className="data-page">
    <header className="data-head"><div><Link className="text-link" href="/app">← Рабочее пространство</Link><p className="eyebrow">RELAY CRM · ДАННЫЕ</p><h1>Импорт и экспорт</h1></div></header>
    <ClientDataPortability canWrite={context.membership.role !== "viewer"}/>
    <section className="panel data-rules" aria-labelledby="rules-heading"><div className="panel-head"><div><p className="eyebrow">БЕЗОПАСНАЯ ЗАГРУЗКА</p><h2 id="rules-heading">Как выполняется импорт</h2></div></div><ul><li>Сначала проверяется весь файл и каждая строка.</li><li>При любой ошибке импорт отменяется целиком.</li><li>Все строки добавляются одним запросом только в workspace из вашей membership.</li><li>Архивные клиенты не входят в экспорт.</li></ul></section>
  </main>;
}
