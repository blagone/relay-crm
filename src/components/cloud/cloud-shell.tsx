import { bootstrapWorkspace, logout } from "@/app/actions/auth";
import { ClientCard } from "@/components/cloud/client-card";
import { ClientForm } from "@/components/cloud/client-form";
import { InquiryCard } from "@/components/cloud/inquiry-card";
import { InquiryForm } from "@/components/cloud/inquiry-form";
import { money } from "@/lib/domain";
import type { CloudWorkspaceDTO } from "@/lib/server/queries";

export function WorkspaceSetup({ email, error }: { email?: string; error?: string }) {
  return <main className="setup"><div className="logo-mark">R</div><p className="eyebrow">ПЕРВЫЙ ЗАПУСК</p><h1>Создайте рабочее пространство</h1><p>Аккаунт {email ?? "подтверждён"}. Название можно будет изменить владельцу позже.</p>{error && <p className="form-error">Не удалось создать пространство. Возможно, оно уже существует.</p>}<form action={bootstrapWorkspace}><label>Название<input name="name" required minLength={1} maxLength={80} placeholder="Например, Студия Андрея"/></label><button className="primary">Создать пространство</button></form><form action={logout}><button className="text-link">Выйти</button></form></main>;
}

export function CloudShell({ data, email }: { data: CloudWorkspaceDTO; email?: string }) {
  const active = data.inquiries.filter(inquiry => !["won", "lost"].includes(inquiry.status));
  const pipeline = active.reduce((sum, inquiry) => sum + inquiry.amount_minor, 0);
  const won = data.inquiries.filter(inquiry => inquiry.status === "won").reduce((sum, inquiry) => sum + inquiry.amount_minor, 0);
  const canWrite = data.role !== "viewer";
  const clientNames = new Map([...data.clients, ...data.archivedClients].map(client => [client.id, client.name]));
  return <div className="cloud-shell">
    <aside><div className="brand"><span>R</span><strong>Relay</strong></div><nav><a href="#overview">Обзор</a><a href="#inquiries">Заявки</a><a href="#clients">Клиенты</a></nav><form action={logout}><button>Выйти</button></form></aside>
    <main>
      <div className="cloud-head"><div><p className="eyebrow">{data.role.toUpperCase()}</p><h1>{data.workspace.name}</h1><span>{email}</span></div><span className="cloud-badge">Supabase cloud</span></div>
      <section id="overview" className="metrics"><article><span>В работе</span><strong>{active.length}</strong><small>активные заявки</small></article><article><span>Воронка</span><strong>{money(pipeline)}</strong><small>без архива</small></article><article><span>Выиграно</span><strong>{money(won)}</strong><small>без архива</small></article><article><span>Клиенты</span><strong>{data.clients.length}</strong><small>активные</small></article></section>
      <section id="inquiries" className="panel cloud-inquiries">
        <div className="panel-head"><div><p className="eyebrow">ОБЛАЧНЫЙ CRUD</p><h2>Заявки</h2></div></div>
        {canWrite && data.clients.length > 0 && <InquiryForm clients={data.clients}/>}
        {canWrite && data.clients.length === 0 && <div className="empty compact"><p>Сначала добавьте активного клиента.</p></div>}
        {data.inquiries.length ? <div className="cloud-inquiry-list">{data.inquiries.map(inquiry => <InquiryCard key={inquiry.id} inquiry={inquiry} clientName={clientNames.get(inquiry.client_id) ?? "Клиент"} canWrite={canWrite}/>)}</div> : <div className="empty"><strong>Заявок пока нет</strong><p>Добавьте первую заявку и проведите её по воронке.</p></div>}
        {data.archivedInquiries.length > 0 && <details className="archive-section"><summary>Архив заявок · {data.archivedInquiries.length}</summary><div className="cloud-inquiry-list">{data.archivedInquiries.map(inquiry => <InquiryCard key={inquiry.id} inquiry={inquiry} clientName={clientNames.get(inquiry.client_id) ?? "Клиент"} canWrite={canWrite}/>)}</div></details>}
      </section>
      <section id="clients" className="panel cloud-clients">
        <div className="panel-head"><div><p className="eyebrow">ОБЛАЧНЫЙ CRUD</p><h2>Клиенты</h2></div></div>
        {canWrite && <ClientForm/>}
        {data.clients.length ? <div className="cloud-client-list">{data.clients.map(client => <ClientCard key={client.id} client={client} canWrite={canWrite}/>)}</div> : <div className="empty"><p>Клиентов пока нет.</p></div>}
        {data.archivedClients.length > 0 && <details className="archive-section"><summary>Архив · {data.archivedClients.length}</summary><div className="cloud-client-list">{data.archivedClients.map(client => <ClientCard key={client.id} client={client} canWrite={canWrite}/>)}</div></details>}
      </section>
    </main>
  </div>;
}
