import type { Database } from "@/lib/supabase/database.types";
import type { WorkspaceMember } from "@/lib/server/queries";
import type { ReportPeriod } from "@/lib/cloud/report-input";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
export const REPORT_STATUSES = ["new", "contacted", "proposal", "won", "lost"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const reportStatusLabels: Record<ReportStatus, string> = {
  new: "Новые", contacted: "Связались", proposal: "Предложение", won: "Выиграны", lost: "Проиграны",
};

export type ReportMetrics = ReturnType<typeof calculateReportMetrics>;

export function calculateReportMetrics(inquiries: Inquiry[], members: WorkspaceMember[], period: ReportPeriod, now = new Date()) {
  const days = period === "all" ? null : Number(period);
  const currentStart = days === null ? null : addDays(now, -days);
  const previousStart = days === null ? null : addDays(now, -(days * 2));
  const included = inquiries.filter(item => !currentStart || new Date(item.created_at) >= currentStart);
  const previous = inquiries.filter(item => previousStart && currentStart && new Date(item.created_at) >= previousStart && new Date(item.created_at) < currentStart);
  const funnel = REPORT_STATUSES.map(status => {
    const rows = included.filter(item => item.status === status);
    return { status, label: reportStatusLabels[status], count: rows.length, amountMinor: sumAmount(rows) };
  });
  const won = included.filter(item => item.status === "won");
  const lost = included.filter(item => item.status === "lost");
  const decided = won.length + lost.length;
  const active = inquiries.filter(item => !item.archived_at && !["won", "lost"].includes(item.status));
  const today = isoDate(now);
  const workload = members.map(member => {
    const assigned = active.filter(item => item.assignee_id === member.user_id);
    return {
      userId: member.user_id,
      email: member.email,
      role: member.role,
      count: assigned.length,
      amountMinor: sumAmount(assigned),
      overdue: assigned.filter(item => item.next_contact_on && item.next_contact_on < today).length,
      dueToday: assigned.filter(item => item.next_contact_on === today).length,
    };
  }).sort((a, b) => b.count - a.count || a.email.localeCompare(b.email));
  const unassigned = active.filter(item => !item.assignee_id);
  return {
    funnel,
    total: included.length,
    totalAmountMinor: sumAmount(included),
    wonCount: won.length,
    wonAmountMinor: sumAmount(won),
    lostCount: lost.length,
    decisionConversion: decided ? won.length / decided : 0,
    overallConversion: included.length ? won.length / included.length : 0,
    previousTotal: previous.length,
    previousWonCount: previous.filter(item => item.status === "won").length,
    workload,
    unassigned: { count: unassigned.length, amountMinor: sumAmount(unassigned) },
  };
}

function sumAmount(rows: Inquiry[]) { return rows.reduce((sum, item) => sum + item.amount_minor, 0); }
function addDays(value: Date, days: number) { return new Date(value.getTime() + days * 86_400_000); }
function isoDate(value: Date) { return value.toISOString().slice(0, 10); }

