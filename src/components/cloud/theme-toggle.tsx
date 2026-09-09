"use client";

import { useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("relay-theme-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("relay-theme-change", callback);
    window.removeEventListener("storage", callback);
  };
}
function getTheme() {
  let saved: string | null = null;
  try { saved = localStorage.getItem("relay-theme"); } catch {}
  const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark;
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getTheme, () => false);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("relay-theme", next ? "dark" : "light"); } catch {}
    window.dispatchEvent(new Event("relay-theme-change"));
  };
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"} aria-pressed={dark}>
    <span aria-hidden="true">{dark ? "☀" : "◐"}</span><span>{dark ? "Светлая тема" : "Тёмная тема"}</span>
  </button>;
}
