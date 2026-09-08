import { redirect } from "next/navigation";
import { ReportsView } from "@/components/cloud/reports-view";
import { parseReportPeriod } from "@/lib/cloud/report-input";
import { readReportWorkspace } from "@/lib/server/report-queries";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const period = parseReportPeriod(typeof params.period === "string" ? params.period : undefined);
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/app");
  const workspace = await readReportWorkspace(user.id);
  if (!workspace) redirect("/app");
  return <ReportsView data={workspace} period={period}/>;
}

