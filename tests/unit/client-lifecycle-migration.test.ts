import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202609080001_client_audit.sql", "utf8").toLowerCase();
const rollback = readFileSync("supabase/rollback/202609080001_client_audit.down.sql", "utf8").toLowerCase();

describe("client lifecycle audit migration", () => {
  it("records successful inserts and guarded updates", () => {
    expect(migration).toContain("after insert or update on public.clients");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("'archived'");
    expect(migration).toContain("'restored'");
    expect(migration).toContain("'changed_fields'");
  });

  it("has a matching rollback", () => {
    expect(rollback).toContain("drop trigger if exists client_write_audit");
    expect(rollback).toContain("drop function if exists public.audit_client_write()");
  });
});
