// @ts-expect-error The Edge runtime resolves npm: specifiers during deployment.
import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
type InvitationPayload = { email: string; workspace_name: string; role: "manager" | "viewer"; expires_at: string };

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
})[character] ?? character);

Deno.serve(async request => {
  if (request.method !== "POST") return json(405, { ok: false });

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json(401, { ok: false });
  let input: unknown;
  try { input = await request.json(); } catch { return json(400, { ok: false }); }
  const invitationId = typeof input === "object" && input !== null && "invitationId" in input
    ? String(input.invitationId)
    : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    return json(400, { ok: false });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const token = authorization.slice(7);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return json(401, { ok: false });

  const { data, error } = await supabase.rpc("get_invitation_email_payload", { invitation_id: invitationId });
  const invitation = (data as InvitationPayload[] | null)?.[0];
  // Same response for absent, stale, foreign, revoked, and otherwise unavailable ids.
  if (error || !invitation) return json(404, { ok: false });

  const siteUrl = Deno.env.get("SITE_URL") ?? "";
  let teamUrl: string;
  try {
    const origin = new URL(siteUrl);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash) throw new Error();
    teamUrl = new URL("/app/team", origin.origin).toString();
  } catch { return json(503, { ok: false }); }

  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("INVITATION_FROM_EMAIL") ?? "";
  if (!apiKey || !from) return json(503, { ok: false });
  const workspace = escapeHtml(String(invitation.workspace_name));
  const link = escapeHtml(teamUrl);
  const role = invitation.role === "manager" ? "менеджера" : "наблюдателя";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `relay-team-invitation-${invitationId}`,
    },
    body: JSON.stringify({
      from,
      to: [invitation.email],
      subject: `Приглашение в Relay CRM — ${invitation.workspace_name}`,
      html: `<p>Вас пригласили в рабочее пространство <strong>${workspace}</strong> с ролью ${role}.</p><p><a href="${link}">Открыть Relay CRM</a></p><p>Зарегистрируйтесь с адресом, на который пришло это письмо, подтвердите почту и примите приглашение на странице команды. Приглашение действует 7 дней.</p>`,
      text: `Вас пригласили в рабочее пространство ${invitation.workspace_name} с ролью ${role}. Откройте ${teamUrl}, зарегистрируйтесь с адресом, на который пришло письмо, подтвердите почту и примите приглашение. Приглашение действует 7 дней.`,
    }),
  });
  if (!response.ok) return json(502, { ok: false });
  return json(200, { ok: true });
});
