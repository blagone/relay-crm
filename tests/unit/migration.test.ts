import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql=readFileSync("supabase/migrations/202609070001_initial.sql","utf8").toLowerCase();
describe("prepared Supabase migration",()=>{
 it("splits inquiry insert audit from guarded update",()=>{expect(sql).toContain("create trigger inquiry_insert_audit after insert");expect(sql).toContain("create trigger inquiry_update_guard_audit before update")});
 it("does not grant or policy-enable deletes",()=>{expect(sql).not.toContain("for all to authenticated");expect(sql).not.toMatch(/grant[^;]*delete/);expect(sql).toContain("grant insert,update on public.clients,public.inquiries")});
 it("guards optimistic versions and immutable identity",()=>{expect(sql).toContain("stale client version");expect(sql).toContain("stale inquiry version");expect(sql).toContain("immutable inquiry identity fields")});
 it("normalizes inserts and restricts workspace bootstrap",()=>{expect(sql).toContain("new.status:='new'");expect(sql).toContain("unique(created_by)");expect(sql).toContain("email_confirmed_at is not null")});
});
