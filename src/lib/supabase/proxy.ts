import { createServerClient } from "@supabase/ssr";
import { NextResponse,type NextRequest } from "next/server";
import { readSupabaseEnv } from "./env";
import type { Database } from "./database.types";
export async function refreshSupabaseSession(request:NextRequest){const env=readSupabaseEnv();if(!env.configured)return NextResponse.next({request});let response=NextResponse.next({request});const supabase=createServerClient<Database>(env.value.url,env.value.publishableKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(items)=>{items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});await supabase.auth.getClaims();return response}
