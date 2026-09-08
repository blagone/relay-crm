import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createClientSchema } from "../../src/lib/cloud/client-input";

describe("cloud client creation", () => {
  it("normalizes valid input and accepts empty optional contacts", () => {
    const result = createClientSchema.parse({ name: "  Анна  ", company: "  Relay  ", email: "", phone: "" });
    expect(result).toEqual({ name: "Анна", company: "Relay", email: "", phone: "" });
  });

  it("rejects invalid and oversized input", () => {
    expect(createClientSchema.safeParse({ name: " ", company: "", email: "", phone: "" }).success).toBe(false);
    expect(createClientSchema.safeParse({ name: "Анна", company: "", email: "bad", phone: "" }).success).toBe(false);
    expect(createClientSchema.safeParse({ name: "x".repeat(121), company: "", email: "", phone: "" }).success).toBe(false);
  });

  it("derives workspace on the server after fresh authentication", () => {
    const action = readFileSync("src/app/actions/clients.ts", "utf8");
    expect(action).toContain("supabase.auth.getUser()");
    expect(action).toContain('.from("memberships")');
    expect(action).toContain('.eq("user_id", user.id)');
    expect(action).toContain("workspace_id: membership.workspace_id");
    expect(action).not.toContain('formData.get("workspace_id")');
    expect(action).toContain('revalidatePath("/app")');
  });
});
