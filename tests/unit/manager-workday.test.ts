import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInquiryNoteSchema, inquiryContactSchema } from "../../src/lib/cloud/inquiry-input";

const inquiryId = "0f77cf77-c3c2-4f80-bacf-d5dc22c5b01c";

describe("manager workday cloud slice", () => {
  it("validates bounded notes and exact contact dates", () => {
    expect(createInquiryNoteSchema.parse({ inquiryId, body: "  Позвонить после обеда  " }).body).toBe("Позвонить после обеда");
    expect(createInquiryNoteSchema.safeParse({ inquiryId, body: " ".repeat(2) }).success).toBe(false);
    expect(createInquiryNoteSchema.safeParse({ inquiryId, body: "x".repeat(4001) }).success).toBe(false);
    expect(inquiryContactSchema.safeParse({ inquiryId, version: "2", nextContactOn: "2026-09-09" }).success).toBe(true);
    expect(inquiryContactSchema.safeParse({ inquiryId, version: "2", nextContactOn: "" }).success).toBe(false);
  });

  it("authenticates, derives workspace and scopes note/contact writes", () => {
    const actions = readFileSync("src/app/actions/inquiries.ts", "utf8");
    expect(actions).toContain("createCloudInquiryNote");
    expect(actions).toContain("rescheduleCloudInquiry");
    expect(actions).toContain("supabase.auth.getUser()");
    expect(actions).toContain("workspace_id: context.membership.workspace_id");
    expect(actions).toContain("author_id: context.membership.user_id");
    expect(actions).not.toContain('formData.get("workspace_id")');
    expect(actions).toContain('.eq("workspace_id", context.membership.workspace_id)');
    expect(actions).toContain('revalidatePath("/app")');
  });

  it("loads tenant-scoped notes and renders dashboard, filters and activity", () => {
    const queries = readFileSync("src/lib/server/queries.ts", "utf8");
    const shell = readFileSync("src/components/cloud/cloud-shell.tsx", "utf8");
    const workspace = readFileSync("src/components/cloud/inquiry-workspace.tsx", "utf8");
    expect(queries).toContain('from("notes").select("*").eq("workspace_id",workspaceId)');
    expect(shell).toContain("ManagerDashboard");
    expect(workspace).toContain("Дата контакта");
    expect(workspace).toContain("setStatus");
    expect(workspace).toContain("setSource");
    expect(workspace).toContain("setClientId");
  });
});
