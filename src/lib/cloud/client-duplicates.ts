export function normalizeClientEmail(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("en") ?? "";
}
export function normalizeClientPhone(value: string | null | undefined) {
  return value?.replace(/[^\d+]/g, "") ?? "";
}
export function duplicateClientMatches<T extends { id: string; name: string; email: string | null; phone: string | null }>(clients: T[], candidate: { email: string; phone: string }, excludeId?: string) {
  const email = normalizeClientEmail(candidate.email); const phone = normalizeClientPhone(candidate.phone);
  return clients.filter(client => client.id !== excludeId && ((email && normalizeClientEmail(client.email) === email) || (phone && normalizeClientPhone(client.phone) === phone)));
}
