import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createInquirySchema,
  inquiryLifecycleSchema,
  inquiryTransitionSchema,
  isAllowedInquiryTransition,
  updateInquirySchema,
} from "../../src/lib/cloud/inquiry-input";

describe("cloud inquiry lifecycle", () => {
  const identity = { inquiryId: "0f77cf77-c3c2-4f80-bacf-d5dc22c5b01c", version: "2" };

  it("normalizes creation fields and converts rubles to minor units", () => {
    const result = createInquirySchema.parse({ clientId: identity.inquiryId, title: "  Сайт  ", description: "  лид  ", source: "website", amountMinor: "1250,50", nextContactOn: "2026-09-10" });
    expect(result).toMatchObject({ title: "Сайт", description: "лид", amountMinor: 125050, nextContactOn: "2026-09-10" });
  });

  it("rejects malformed money, dates and identities", () => {
    expect(createInquirySchema.safeParse({ clientId: "bad", title: "", description: "", source: "bad", amountMinor: "1.234", nextContactOn: "2026-99-99" }).success).toBe(false);
    expect(inquiryLifecycleSchema.safeParse({ inquiryId: identity.inquiryId, version: "0" }).success).toBe(false);
    expect(updateInquirySchema.safeParse({ ...identity, title: "x", description: "", source: "other", amountMinor: "0", nextContactOn: "" }).success).toBe(true);
  });

  it("allows only the database transition graph", () => {
    expect(isAllowedInquiryTransition("new", "contacted")).toBe(true);
    expect(isAllowedInquiryTransition("new", "won")).toBe(false);
    expect(inquiryTransitionSchema.safeParse({ ...identity, status: "proposal" }).success).toBe(true);
  });

  it("authenticates freshly and derives every workspace scope from membership", () => {
    const action = readFileSync("src/app/actions/inquiries.ts", "utf8");
    expect(action).toContain("supabase.auth.getUser()");
    expect(action).toContain('.from("memberships")');
    expect(action).toContain('.eq("user_id", user.id)');
    expect(action).toContain("workspace_id: context.membership.workspace_id");
    expect(action).not.toContain('formData.get("workspace_id")');
    expect(action).toContain('.eq("version", parsed.data.version)');
    expect(action).toContain('revalidatePath("/app")');
  });
});
