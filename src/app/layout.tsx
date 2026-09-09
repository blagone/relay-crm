import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/cloud/theme-toggle";
export const metadata: Metadata = { title: { default: "Relay CRM", template: "%s · Relay CRM" }, description: "Демо CRM для работы с клиентами и заявками" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('relay-theme');document.documentElement.classList.toggle('dark',t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){}})()` }}/></head><body>{children}<ThemeToggle/></body></html>}
