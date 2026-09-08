import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInquirySchema, updateInquirySchema } from "../../src/lib/cloud/inquiry-input";

const id = "0f77cf77-c3c2-4f80-bacf-d5dc22c5b01c";
const fields = { clientId: id, title: "Заявка", description: "", source: "website", amountMinor: "0", nextContactOn: "" };

describe("inquiry assignment", () => {
  it("normalizes unassigned and validates member identity", () => {
    expect(createInquirySchema.parse({ ...fields, assigneeId: "" }).assigneeId).toBeNull();
    expect(createInquirySchema.parse({ ...fields, assigneeId: id }).assigneeId).toBe(id);
    expect(createInquirySchema.safeParse({ ...fields, assigneeId: "forged" }).success).toBe(false);
    expect(updateInquirySchema.safeParse({ ...fields, clientId: undefined, inquiryId: id, version: "1", assigneeId: id }).success).toBe(true);
  });

  it("scopes assignment writes and member lookup to the authenticated workspace", () => {
    const actions = readFileSync("src/app/actions/inquiries.ts", "utf8");
    const queries = readFileSync("src/lib/server/queries.ts", "utf8");
    const migration = readFileSync("supabase/migrations/202609080004_inquiry_assignment.sql", "utf8");
    expect(actions).toContain("supabase.auth.getUser()");
    expect(actions).toContain('.eq("workspace_id", context.membership.workspace_id).eq("user_id", assigneeId)');
    expect(actions).toContain("assignee_id: parsed.data.assigneeId");
    expect(actions).toContain("assignee_id: fields.assigneeId");
    expect(queries).toContain('supabase.rpc("list_workspace_members", { wid: workspaceId })');
    expect(migration).toContain("caller.user_id=auth.uid()");
    expect(migration).toContain("new.assignee_id is distinct from old.assignee_id");
  });

  it("renders assignee choices, filters and personal dashboard", () => {
    const form = readFileSync("src/components/cloud/inquiry-form.tsx", "utf8");
    const workspace = readFileSync("src/components/cloud/inquiry-workspace.tsx", "utf8");
    const dashboard = readFileSync("src/components/cloud/manager-dashboard.tsx", "utf8");
    expect(form).toContain('name="assigneeId"');
    expect(workspace).toContain("Назначены мне");
    expect(workspace).toContain("Не назначены");
    expect(dashboard).toContain("Мои просроченные");
    expect(dashboard).toContain("Без ответственного");
  });
});
