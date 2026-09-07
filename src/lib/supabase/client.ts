"use client";
import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseEnv } from "./env";
import type { Database } from "./database.types";
export function createBrowserSupabase(){const env=readSupabaseEnv();if(!env.configured)throw new Error("Supabase is not configured");return createBrowserClient<Database>(env.value.url,env.value.publishableKey)}
