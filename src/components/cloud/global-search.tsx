"use client";
import { useMemo, useState } from "react";

type Result = { id: string; kind: "Клиент" | "Заявка"; title: string; subtitle: string; href: string };
export function GlobalSearch({ clients, inquiries }: { clients: { id: string; name: string; company: string | null }[]; inquiries: { id: string; title: string; description: string; clientName: string }[] }) {
 const [query,setQuery]=useState(""); const results=useMemo<Result[]>(()=>{const q=query.trim().toLocaleLowerCase("ru");if(!q)return[];return [...clients.filter(x=>`${x.name} ${x.company??""}`.toLocaleLowerCase("ru").includes(q)).map(x=>({id:x.id,kind:"Клиент" as const,title:x.name,subtitle:x.company??"Без компании",href:"#clients"})),...inquiries.filter(x=>`${x.title} ${x.description} ${x.clientName}`.toLocaleLowerCase("ru").includes(q)).map(x=>({id:x.id,kind:"Заявка" as const,title:x.title,subtitle:x.clientName,href:`#inquiry-${x.id}`}))].slice(0,8)},[query,clients,inquiries]);
 return <div className="global-search"><label><span className="sr-only">Поиск по CRM</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск клиентов и заявок"/></label>{query&&<div className="global-search-results" role="listbox">{results.length?results.map(r=><a href={r.href} key={`${r.kind}-${r.id}`} onClick={()=>setQuery("")} role="option" aria-selected="false"><small>{r.kind}</small><strong>{r.title}</strong><span>{r.subtitle}</span></a>):<p>Ничего не найдено.</p>}</div>}</div>
}

