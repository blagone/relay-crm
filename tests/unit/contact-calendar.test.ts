import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCalendarDays, calendarMonthBounds, currentCalendarDay, currentMonth, parseCalendarMonth, shiftCalendarMonth } from "../../src/lib/cloud/calendar-input";

describe("contact calendar", () => {
  it("validates and bounds the requested month", () => {
    expect(parseCalendarMonth("2028-02", "2026-09")).toBe("2028-02");
    for (const value of ["2026-00", "2026-13", "1999-12", "2101-01", "x", "2026-1"]) expect(parseCalendarMonth(value, "2026-09")).toBe("2026-09");
  });

  it("navigates across years and handles leap days without local timezone math", () => {
    expect(shiftCalendarMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftCalendarMonth("2026-12", 1)).toBe("2027-01");
    expect(calendarMonthBounds("2028-02")).toEqual({ first: "2028-02-01", last: "2028-02-29" });
    const days = buildCalendarDays("2028-02");
    expect(days.length % 7).toBe(0);
    expect(days.find(day => day.iso === "2028-02-29")?.inMonth).toBe(true);
  });

  it("derives the visible month in the configured business timezone", () => {
    expect(currentMonth("Europe/Moscow", new Date("2026-08-31T22:30:00Z"))).toBe("2026-09");
    expect(currentCalendarDay("Europe/Moscow", new Date("2026-08-31T22:30:00Z"))).toBe("2026-09-01");
    expect(currentMonth("America/New_York", new Date("2026-09-01T02:00:00Z"))).toBe("2026-08");
  });

  it("reads only the authenticated membership tenant and renders linked status/assignee entries", () => {
    const query = readFileSync("src/lib/server/calendar-queries.ts", "utf8");
    const page = readFileSync("src/app/app/calendar/page.tsx", "utf8");
    const view = readFileSync("src/components/cloud/contact-calendar.tsx", "utf8");
    expect(page).toContain("supabase.auth.getUser()");
    expect(query).toContain('.eq("user_id", userId)');
    expect(query).toContain('.eq("workspace_id", workspaceId)');
    expect(query).toContain('.gte("next_contact_on", first).lte("next_contact_on", last)');
    expect(query).not.toContain("service_role");
    expect(view).toContain('/app#inquiry-${inquiry.id}');
    expect(view).toContain("statusLabels[inquiry.status]");
    expect(view).toContain("Без ответственного");
  });
});
