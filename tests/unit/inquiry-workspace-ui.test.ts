import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/components/cloud/inquiry-workspace.tsx", "utf8");
const card = readFileSync("src/components/cloud/inquiry-card.tsx", "utf8");
const styles = readFileSync("src/app/globals.css", "utf8");

describe("inquiry workspace presentation", () => {
  it("offers accessible board and list views over the same filtered records", () => {
    expect(workspace).toContain('role="group" aria-label="Вид заявок"');
    expect(workspace).toContain('aria-pressed={view === "board"}');
    expect(workspace).toContain('aria-pressed={view === "list"}');
    expect(workspace).toContain('view === "list"');
    expect(workspace).toContain("inquiry-list-view");
    expect(workspace.match(/filtered\.map\(inquiry => <InquiryCard/g)).toHaveLength(1);
  });

  it("collapses mobile filters behind a counted accessible control and keeps reset available", () => {
    expect(workspace).toContain('aria-expanded={filtersOpen}');
    expect(workspace).toContain('aria-controls="inquiry-filter-fields"');
    expect(workspace).toContain("activeFilterCount");
    expect(workspace).toContain("Сбросить");
    expect(styles).toContain(".cloud-filters{display:none}");
    expect(styles).toContain(".cloud-filters.mobile-open{display:grid}");
  });

  it("shows assignee and contact urgency only for open, unarchived cards", () => {
    expect(card).toContain('const open = !archived && inquiry.status !== "won" && inquiry.status !== "lost"');
    expect(card).toContain('{open && <span className="inquiry-card-meta">');
    expect(card).toContain('const overdue = open && Boolean(inquiry.next_contact_on && inquiry.next_contact_on < today)');
    expect(card).toContain('{contactLabel}</span>{overdue && <span className="overdue">Просрочено</span>}');
  });
});
