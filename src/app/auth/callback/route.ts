import { NextResponse,type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { readSupabaseEnv } from "@/lib/supabase/env";
const allowed=new Set(["/app","/app/recover"]);
export async function GET(request:NextRequest){const url=new URL(request.url),code=url.searchParams.get("code"),requested=url.searchParams.get("next")??"/app",next=allowed.has(requested)?requested:"/app";if(!readSupabaseEnv().configured)return NextResponse.redirect(new URL("/app?authError=config",request.url));if(code){const supabase=await createServerSupabase();const{error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,request.url))}return NextResponse.redirect(new URL("/app?authError=callback",request.url))}
