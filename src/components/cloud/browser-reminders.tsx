"use client";

import { useState } from "react";

export function BrowserReminders({ overdue, today }: { overdue: number; today: number }) {
  const [state, setState] = useState<"idle" | "enabled" | "blocked">("idle");
  const enable = async () => {
    if (!("Notification" in window)) { setState("blocked"); return; }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setState("blocked"); return; }
    new Notification("Relay CRM", { body: overdue ? `Есть просроченные контакты: ${overdue}.` : `Контакты на сегодня: ${today}.` });
    setState("enabled");
  };
  if (!overdue && !today) return null;
  return <div className={`browser-reminder${overdue ? " overdue" : ""}`} role="status"><span aria-hidden="true">●</span><p>{overdue ? `Просрочено контактов: ${overdue}` : `Контактов на сегодня: ${today}`}</p><button className="text-link" type="button" onClick={enable}>{state === "enabled" ? "Напоминание включено" : state === "blocked" ? "Уведомления отключены" : "Напомнить в браузере"}</button></div>;
}
