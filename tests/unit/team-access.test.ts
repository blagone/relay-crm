import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { inviteTeamSchema, memberRoleSchema } from "../../src/lib/cloud/team-input";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn(), revalidatePath: vi.fn(), eq: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => {
  const query = { select: () => query, eq: (...args: unknown[]) => { mocks.eq(...args); return query; }, order: () => query, limit: () => query, maybeSingle: mocks.maybeSingle };
  return { auth: { getUser: mocks.getUser }, from: () => query, rpc: mocks.rpc };
} }));
import { inviteTeamMember, acceptTeamInvitation, changeTeamMemberRole, removeTeamMember, revokeTeamInvitation } from "../../src/app/actions/team";
const wid = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const initial = { status: "idle" } as const;
const form = (data: Record<string, string>) => { const value = new FormData(); for (const [key, text] of Object.entries(data)) value.set(key, text); return value; };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: { workspace_id: wid, role: "owner" }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});
describe("team schemas and actions", () => {
  it("normalizes email and rejects owner grants or malformed identities", () => {
    expect(inviteTeamSchema.parse({ email: " USER@EXAMPLE.COM ", role: "viewer" }).email).toBe("user@example.com");
    expect(inviteTeamSchema.safeParse({ email: "x@example.com", role: "owner" }).success).toBe(false);
    expect(inviteTeamSchema.safeParse({ email: "not-email", role: "viewer" }).success).toBe(false);
    expect(memberRoleSchema.safeParse({ memberId, expectedRole: "owner", role: "viewer" }).success).toBe(false);
    expect(memberRoleSchema.safeParse({ memberId: "bad", expectedRole: "viewer", role: "manager" }).success).toBe(false);
  });
  it("derives workspace from fresh owner membership, ignoring a forged workspace", async () => {
    const result = await inviteTeamMember(initial, form({ email: "user@example.com", role: "viewer", workspace_id: memberId }));
    expect(result.status).toBe("success");
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.rpc).toHaveBeenCalledWith("invite_team_member", { wid, invite_email: "user@example.com", invite_role: "viewer" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/team");
  });
  it.each(["manager", "viewer"])("denies every owner mutation to %s", async role => {
    mocks.maybeSingle.mockResolvedValue({ data: { workspace_id: wid, role }, error: null });
    const results = await Promise.all([
      inviteTeamMember(initial, form({ email: "user@example.com", role: "viewer" })),
      changeTeamMemberRole(initial, form({ memberId, expectedRole: "viewer", role: "manager" })),
      removeTeamMember(initial, form({ memberId, expectedRole: "viewer" })),
      revokeTeamInvitation(initial, form({ invitationId: memberId })),
    ]);
    expect(results.every(result => result.status === "error")).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects stale/absent authentication without calling RPC", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect((await acceptTeamInvitation(initial, form({ invitationId: memberId }))).status).toBe("error");
    expect((await inviteTeamMember(initial, form({ email: "user@example.com", role: "viewer" }))).status).toBe("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("acceptance uses only invitation id; confirmed email and workspace are database-derived", async () => {
    expect((await acceptTeamInvitation(initial, form({ invitationId: memberId, email: "forged@example.com", workspace_id: wid, role: "owner" }))).status).toBe("success");
    expect(mocks.rpc).toHaveBeenCalledWith("accept_team_invitation", { invitation_id: memberId });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
  it("passes expected role to role/revocation RPCs", async () => {
    await changeTeamMemberRole(initial, form({ memberId, expectedRole: "viewer", role: "manager" }));
    expect(mocks.rpc).toHaveBeenCalledWith("change_team_member_role", { wid, member_id: memberId, expected_role: "viewer", new_role: "manager" });
    await removeTeamMember(initial, form({ memberId, expectedRole: "manager" }));
    expect(mocks.rpc).toHaveBeenCalledWith("remove_team_member", { wid, member_id: memberId, expected_role: "manager" });
  });
  it("does not expose database details or revalidate on failed RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "sensitive database details" } });
    const result = await inviteTeamMember(initial, form({ email: "user@example.com", role: "viewer" }));
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("sensitive");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
describe("team database security contract (structure, not SQL execution)", () => {
  const sql = readFileSync("supabase/migrations/202609080002_team_access.sql", "utf8");
  it("locks both paths before deciding single-workspace membership", () => {
    expect(sql.match(/account already has a workspace/g)).toHaveLength(2);
    expect(sql.match(/u.email_confirmed_at is not null for update/g)).toHaveLength(2);
    expect(sql).toContain("invitation.email<>confirmed_email");
    expect(sql).toContain("invitation.expires_at<=now()");
  });
  it("disallows direct access and protects owner membership", () => {
    expect(sql).toContain("revoke all on public.team_invitations from public,anon,authenticated");
    expect(sql).toContain("alter table public.team_invitations enable row level security");
    expect(sql).toContain("role=expected_role and role<>'owner'");
    expect(sql).toContain("new_role not in ('manager','viewer')");
    expect(sql).toContain("revoke all on function public.require_team_owner(uuid) from public,anon,authenticated");
    expect(sql).not.toContain("service_role");
  });
  it("clears assignments before deletion and records changes without emails in audit", () => {
    expect(sql.indexOf("update public.inquiries set assignee_id=null")).toBeLessThan(sql.indexOf("delete from public.memberships"));
    expect(sql).toContain('"team_member_removed"');
    expect(sql).toContain('"team_member_role"');
  });
});
