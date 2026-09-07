import { redirect } from "next/navigation";
import { RecoveryForm } from "@/components/cloud/recovery-form";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function RecoverPage(){if(!readSupabaseEnv().configured)redirect("/app");const supabase=await createServerSupabase();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/app?authError=recovery");return <main className="auth-page"><section className="auth-card"><div className="logo-mark">R</div><p className="eyebrow">ВОССТАНОВЛЕНИЕ ДОСТУПА</p><h1>Новый пароль</h1><p className="auth-copy">Сессия восстановления подтверждена. Задайте новый пароль для аккаунта.</p><RecoveryForm/></section></main>}
