"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="route-state" role="alert">
    <div className="route-state-mark error" aria-hidden="true">!</div>
    <h1>Не удалось загрузить данные</h1>
    <p>Проверьте подключение и попробуйте ещё раз. Внесённые ранее данные останутся на месте.</p>
    <button className="primary" type="button" onClick={reset}>Повторить</button>
  </main>;
}
