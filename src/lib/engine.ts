export const WINDOW_MS = 60_000;
export const COOLDOWN_MS = 300_000;
export type Message = { id: string; userId: string; username: string; text: string; at: number; groupId?: string };
export type Group = { id: string; title: string; answeredAt?: number; cooldownUntil?: number; dismissedAt?: number };
export type Featured = { id: string; title: string; count: number; at: number };
export type Engine = { visibleIds: string[] | null; messages: Message[]; groups: Group[]; featured: Featured | null; total: number; repeats: number; capacity: boolean };
export type Card = Group & { count: number; latest: number; examples: Message[] };
export function createEngine(): Engine { return { visibleIds: null, messages: [], groups: [], featured: null, total: 0, repeats: 0, capacity: false }; }
export function prune(e: Engine, now: number) {
  e.messages = e.messages.filter(m => m.at > now - WINDOW_MS);
  e.groups = e.groups.filter(g => e.messages.some(m => m.groupId === g.id) || (g.cooldownUntil ?? 0) > now || e.featured?.id === g.id || g.dismissedAt !== undefined || (e.visibleIds ?? []).includes(g.id));
}
export function ingest(e: Engine, message: Message, group: Pick<Group, 'id' | 'title'> | null, now = message.at) {
  prune(e, now);
  if (e.messages.some(m => m.id === message.id)) return;
  e.total++;
  if (e.messages.length >= 2000) { e.capacity = true; return; }
  if (group && !e.groups.some(g => g.id === group?.id)) {
    if (e.groups.length >= 100) { e.capacity = true; group = null; }
    else e.groups.push({ ...group });
  }
  const groupId = group?.id;
  if (groupId && e.messages.some(m => m.groupId === groupId && m.userId === message.userId)) e.repeats++;
  e.messages.push({ ...message, groupId: group?.id });
}
export function cards(e: Engine, now: number): Card[] {
  prune(e, now);
  return e.groups.map(g => {
    const messages = e.messages.filter(m => m.groupId === g.id && (!g.answeredAt || m.at > g.answeredAt));
    const unique = [...new Map(messages.map(m => [m.userId, m])).values()];
    return { ...g, count: unique.length, latest: Math.max(0, ...messages.map(m => m.at)), examples: unique.slice(-3) };
  }).sort((a, b) => b.count - a.count || b.latest - a.latest || a.id.localeCompare(b.id));
}
export function queue(e: Engine, now: number) { return cards(e, now).filter(g => g.dismissedAt === undefined && g.count > 0 && (g.cooldownUntil ?? 0) <= now).slice(0, 3); }
export function refreshQueue(e: Engine, now: number) { e.visibleIds = queue(e, now).map(g => g.id); }
export function visibleQueue(e: Engine, now: number) {
  if (e.visibleIds == null && queue(e, now).length) refreshQueue(e, now);
  const all = cards(e, now);
  return (e.visibleIds ?? []).flatMap(id => {
    const card = all.find(g => g.id === id && g.dismissedAt === undefined && (g.cooldownUntil ?? 0) <= now);
    return card ? [card] : [];
  });
}
export function act(e: Engine, action: 'feature' | 'unfeature' | 'answer' | 'undo' | 'dismiss' | 'restore', id: string | undefined, now: number) {
  if (action === 'unfeature') { e.featured = null; return; }
  const g = e.groups.find(g => g.id === id);
  if (!g) throw new Error('This question has expired. Choose a current question.');
  if (action === 'dismiss') {
    g.dismissedAt = now;
    if (e.featured?.id === id) e.featured = null;
  }
  if (action === 'restore') delete g.dismissedAt;
  if ((action === 'feature' || action === 'answer') && g.dismissedAt !== undefined) throw new Error('Restore this question before using it.');
  if (action === 'feature') {
    const card = cards(e, now).find(c => c.id === id);
    if (!card?.count || (g.cooldownUntil ?? 0) > now) throw new Error('This question is no longer available to feature.');
    e.featured = { id: g.id, title: g.title, count: card.count, at: now };
  }
  if (action === 'answer' && (g.cooldownUntil ?? 0) <= now) {
    g.answeredAt = now; g.cooldownUntil = now + COOLDOWN_MS;
    if (e.featured?.id === id) e.featured = null;
  }
  if (action === 'undo') { delete g.answeredAt; delete g.cooldownUntil; }
}
