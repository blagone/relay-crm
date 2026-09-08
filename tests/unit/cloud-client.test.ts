import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clientLifecycleSchema, createClientSchema, updateClientSchema } from "../../src/lib/cloud/client-input";

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

  it("validates edit identity and optimistic version", () => {
    const valid = { clientId: "0f77cf77-c3c2-4f80-bacf-d5dc22c5b01c", version: "3", name: "Анна", company: "", email: "", phone: "" };
    expect(updateClientSchema.parse(valid).version).toBe(3);
    expect(clientLifecycleSchema.safeParse({ clientId: valid.clientId, version: "0" }).success).toBe(false);
    expect(clientLifecycleSchema.safeParse({ clientId: "not-an-id", version: "1" }).success).toBe(false);
  });

  it("scopes lifecycle mutations and checks the submitted version", () => {
    const action = readFileSync("src/app/actions/clients.ts", "utf8");
    expect(action).toContain('.eq("workspace_id", context.membership.workspace_id)');
    expect(action).toContain('.eq("version", version)');
    expect(action).toContain('.eq("version", parsed.data.version)');
    expect(action).not.toContain('formData.get("workspace_id")');
    expect(action).toContain("archiveCloudClient");
    expect(action).toContain("restoreCloudClient");
  });
});
