"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof window !== "undefined" && (localStorage.getItem("relay-theme") === "dark" || (!localStorage.getItem("relay-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)));
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("relay-theme", next ? "dark" : "light");
  };
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"} aria-pressed={dark}>
    <span aria-hidden="true">{dark ? "☀" : "◐"}</span><span>{dark ? "Светлая тема" : "Тёмная тема"}</span>
  </button>;
}
