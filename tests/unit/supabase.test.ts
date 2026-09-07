import { afterEach,describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { readSupabaseEnv } from "../../src/lib/supabase/env";
const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
afterEach(()=>{if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldKey});
describe("Supabase boundary",()=>{
 it("reports missing configuration without fallback",()=>{delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;const result=readSupabaseEnv();expect(result.configured).toBe(false);if(!result.configured)expect(result.missing).toHaveLength(2)});
 it("accepts only HTTPS and a bounded public key",()=>{process.env.NEXT_PUBLIC_SUPABASE_URL="http://unsafe.test";process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="short";expect(readSupabaseEnv().configured).toBe(false);process.env.NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co";process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_12345678901234567890";expect(readSupabaseEnv().configured).toBe(true);process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_secret_12345678901234567890";expect(readSupabaseEnv().configured).toBe(false)});
 it("uses Next 16 proxy and server authorization boundaries",()=>{const proxy=readFileSync("src/proxy.ts","utf8"),actions=readFileSync("src/app/actions/auth.ts","utf8"),page=readFileSync("src/app/app/page.tsx","utf8"),callback=readFileSync("src/app/auth/callback/route.ts","utf8");expect(proxy).toContain("export async function proxy");expect(actions).toContain("auth.getUser()");expect(page).toContain("auth.getClaims()");expect(callback).toContain("allowed.has(requested)");expect(callback).toContain("/app/recover");expect(actions).toContain("/auth/callback?next=/app/recover");expect(actions).toContain("auth.updateUser({password");expect(actions).toContain("auth.getUser()");expect(page).not.toContain("DemoApp")});
 it("protects the complete password recovery route",()=>{const actions=readFileSync("src/app/actions/auth.ts","utf8"),callback=readFileSync("src/app/auth/callback/route.ts","utf8"),page=readFileSync("src/app/app/recover/page.tsx","utf8");expect(actions).toContain("/auth/callback?next=/app/recover");expect(actions).toContain("auth.updateUser({password");expect(callback).toContain("/app/recover");expect(page).toContain("auth.getUser()")});
});



