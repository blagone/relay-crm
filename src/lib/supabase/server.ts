import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseEnv } from "./env";
import type { Database } from "./database.types";
export async function createServerSupabase(){
 const env=readSupabaseEnv();
 if(!env.configured)throw new Error("Supabase is not configured");
 const store=await cookies();
 return createServerClient<Database>(env.value.url,env.value.publishableKey,{cookies:{
  getAll:()=>store.getAll(),
  setAll:(items)=>{try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Components cannot write cookies; proxy refreshes them. */}}
 }});
}
