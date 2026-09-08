import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateReportMetrics } from "../../src/lib/cloud/report-metrics";
import { parseReportPeriod, reportPeriodSchema } from "../../src/lib/cloud/report-input";
import type { Database } from "../../src/lib/supabase/database.types";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
const base: Inquiry = { id: "1", workspace_id: "w", client_id: "c", title: "Lead", description: "", source: "website", status: "new", amount_minor: 10_000, assignee_id: "u1", next_contact_on: null, created_at: "2026-09-01T12:00:00Z", updated_at: "2026-09-01T12:00:00Z", closed_at: null, archived_at: null, version: 1 };
const inquiry = (fields: Partial<Inquiry>): Inquiry => ({ ...base, ...fields });
const members = [{ user_id: "u1", email: "one@example.com", role: "manager" as const }, { user_id: "u2", email: "two@example.com", role: "viewer" as const }];

describe("cloud reports", () => {
  it("accepts only bounded period choices and defaults safely", () => {
    expect(reportPeriodSchema.safeParse("90").success).toBe(true);
    expect(reportPeriodSchema.safeParse("-1").success).toBe(false);
    expect(parseReportPeriod(["365"])).toBe("30");
    expect(parseReportPeriod("forged")).toBe("30");
  });

  it("calculates funnel, conversions, comparison and current workload", () => {
    const rows = [
      inquiry({ id: "new", created_at: "2026-09-01T00:00:00Z", next_contact_on: "2026-09-07" }),
      inquiry({ id: "won", status: "won", amount_minor: 30_000, created_at: "2026-08-30T00:00:00Z", closed_at: "2026-09-02T00:00:00Z" }),
      inquiry({ id: "lost", status: "lost", amount_minor: 20_000, assignee_id: "u2", created_at: "2026-08-29T00:00:00Z", closed_at: "2026-09-03T00:00:00Z" }),
      inquiry({ id: "previous", created_at: "2026-07-25T00:00:00Z" }),
      inquiry({ id: "archived", created_at: "2026-09-01T00:00:00Z", archived_at: "2026-09-04T00:00:00Z" }),
      inquiry({ id: "unassigned", created_at: "2026-09-02T00:00:00Z", assignee_id: null }),
    ];
    const result = calculateReportMetrics(rows, members, "30", new Date("2026-09-08T12:00:00Z"));
    expect(result.total).toBe(5);
    expect(result.previousTotal).toBe(1);
    expect(result.wonAmountMinor).toBe(30_000);
    expect(result.decisionConversion).toBe(0.5);
    expect(result.overallConversion).toBe(0.2);
    expect(result.workload[0]).toMatchObject({ userId: "u1", count: 2, overdue: 1, amountMinor: 20_000 });
    expect(result.unassigned).toEqual({ count: 1, amountMinor: 10_000 });
  });

  it("uses fresh auth and derives the tenant scope before report reads", () => {
    const page = readFileSync("src/app/app/reports/page.tsx", "utf8");
    const query = readFileSync("src/lib/server/report-queries.ts", "utf8");
    expect(page).toContain("supabase.auth.getUser()");
    expect(query).toContain('.from("memberships")');
    expect(query).toContain('.eq("user_id", userId)');
    expect(query).toContain('.eq("workspace_id", workspaceId)');
    expect(query).not.toContain("service_role");
  });
});
