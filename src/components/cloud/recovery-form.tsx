"use client";
import { useActionState } from "react";
import { updatePassword,type AuthState } from "@/app/actions/auth";
const initial:AuthState={};
export function RecoveryForm(){const[state,action,pending]=useActionState(updatePassword,initial);return <form action={action}><label>Новый пароль<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required autoFocus/></label><small>Минимум 8 символов: буква, цифра и специальный знак.</small>{state.error&&<p className="form-error" role="alert">{state.error}</p>}<button className="primary" disabled={pending}>{pending?"Сохраняем…":"Обновить пароль"}</button></form>}
