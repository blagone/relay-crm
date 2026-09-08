import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamPanel } from "@/components/cloud/team-panel";
import { readTeamData } from "@/lib/server/team-queries";
import { createServerSupabase } from "@/lib/supabase/server";
import { readSupabaseEnv } from "@/lib/supabase/env";
export const dynamic = "force-dynamic";
export default async function TeamPage() {
  if (!readSupabaseEnv().configured) redirect("/app");
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/app");
  const data = await readTeamData(user.id);
  return <main className="setup" style={{ maxWidth: 960 }}><Link className="text-link" href="/app">← Рабочее пространство</Link><p className="eyebrow">RELAY CRM · КОМАНДА</p><h1>Команда и доступ</h1><p>{user.email}</p>
    {data.unavailable ? <p className="form-error" role="alert">Раздел команды временно недоступен. Проверьте применение миграции команды и обновите страницу.</p> : <TeamPanel members={data.members} invitations={data.invitations} workspaceId={data.membership?.workspace_id} owner={data.membership?.role === "owner"}/>}
  </main>;
}
