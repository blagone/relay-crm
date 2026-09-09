"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/app#today", label: "Сегодня", icon: "◷", hash: "today" },
  { href: "/app#overview", label: "Обзор", icon: "▦", hash: "overview" },
  { href: "/app#inquiries", label: "Заявки", icon: "◇", hash: "inquiries" },
  { href: "/app#clients", label: "Клиенты", icon: "◎", hash: "clients" },
  { href: "/app#activity", label: "История", icon: "↻", hash: "activity" },
  { href: "/app/calendar", label: "Календарь", icon: "□" },
  { href: "/app/reports", label: "Отчёты", icon: "⌁" },
  { href: "/app/team", label: "Команда", icon: "♙" },
  { href: "/app/data", label: "Данные", icon: "⇅" },
] as const;

export function CloudNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash.slice(1));
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const shown = mobile ? items.filter(item => ["today", "inquiries", "clients"].includes("hash" in item ? item.hash : "") || item.href === "/app/calendar" || item.href === "/app/team") : items;
  return <nav className={mobile ? "cloud-mobile-nav" : undefined} aria-label="Основная навигация">
    {shown.map(item => {
      const isAnchor = "hash" in item;
      const active = isAnchor ? pathname === "/app" && ((hash || "today") === item.hash) : pathname === item.href;
      return <Link href={item.href} key={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
        <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
