import { randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { cards, createEngine, prune, queue, visibleQueue, type Engine } from './engine';
import { demoBatch, scenarios, type Scenario } from './demo';
import { analyze, configured, createAnalysis, type Analysis } from './grouping';
import { ingest } from './engine';

type Session = { scenario: Scenario; analysis: Analysis; id: string; overlayToken: string; engine: Engine; running: boolean; started: boolean; step: number; touched: number; lastBatch: number };
type Store = { sessions: Map<string, Session>; timer?: ReturnType<typeof setInterval> };
const root = globalThis as typeof globalThis & { copilotAIStore?: Store };
const store: Store = root.copilotAIStore ??= { sessions: new Map() };
if (!store.timer) {
  store.timer = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of store.sessions) {
      if (now - s.touched > 2 * 60 * 60_000) { s.analysis.controller?.abort(); store.sessions.delete(id); continue; }
      prune(s.engine, now);
      if (s.running && now - s.lastBatch >= 2400) { demoBatch(s.engine, s.step++, now, !s.analysis.enabled, s.scenario); s.lastBatch = now; }
      if (now - s.touched < 30_000) {
        const engine = s.engine; const analysis = s.analysis;
        void analyze(engine, analysis, undefined, now, () => s.engine === engine && s.analysis === analysis);
      }
    }
  }, 1000);
  store.timer.unref();
}
export async function session(create = false) {
  const jar = await cookies();
  let s = store.sessions.get(jar.get('copilot-session')?.value ?? '');
  if (!s && create) {
    if (store.sessions.size >= 50) throw new Error('Session capacity reached. Restart the local server to clear unused sessions.');
    const id = randomBytes(32).toString('hex');
    s = { scenario: 'mixed', analysis: createAnalysis(), id, overlayToken: randomBytes(32).toString('hex'), engine: createEngine(), running: false, started: false, step: 0, touched: Date.now(), lastBatch: 0 };
    store.sessions.set(id, s);
    jar.set('copilot-session', id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7200 });
  }
  if (s) s.touched = Date.now();
  return s;
}
export function overlaySession(token: string) { return [...store.sessions.values()].find(s => s.overlayToken === token); }
export function snapshot(s: Session) {
  const now = Date.now();
  const all = cards(s.engine, now);
  const visible = visibleQueue(s.engine, now);
  const ranked = queue(s.engine, now);
  return { scenario: s.scenario ?? 'mixed', queueUpdates: ranked.map(g => g.id).join() !== visible.map(g => g.id).join(), dismissed: all.filter(g => g.dismissedAt !== undefined), analysis: { enabled: s.analysis.enabled, configured: configured(), busy: s.analysis.busy, error: s.analysis.error, lastSuccess: s.analysis.lastSuccess, pending: s.engine.messages.filter(m => !s.analysis.processed.has(m.id)).length, nextAttempt: s.analysis.nextAttempt }, now, mode: 'demo' as const, running: s.running, started: s.started, overlayPath: `/overlay/${s.overlayToken}`, queue: visible, answered: all.filter(g => (g.cooldownUntil ?? 0) > now), featured: s.engine.featured, messages: s.engine.messages.slice(-35).reverse(), stats: { total: s.engine.total, unique: new Set(s.engine.messages.map(m => m.userId)).size, questions: all.filter(g => g.dismissedAt === undefined && g.count > 0 && (g.cooldownUntil ?? 0) <= now).length, repeats: s.engine.repeats }, capacity: s.engine.capacity, lastBatch: s.lastBatch };
}
export type Snapshot = ReturnType<typeof snapshot>;
export function reset(s: Session) { s.analysis.controller?.abort(); s.analysis = createAnalysis(s.analysis.enabled); s.engine = createEngine(); s.step = 0; s.started = false; s.running = false; s.lastBatch = 0; }
export function start(s: Session) { if (!s.started) { demoBatch(s.engine, s.step++, Date.now(), !s.analysis.enabled, s.scenario); s.lastBatch = Date.now(); } s.started = true; s.running = true; }

export function setAI(s: Session, enabled: boolean) {
  if (enabled && !configured()) throw new Error('Set OPENAI_API_KEY and OPENAI_MODEL in .env.local, then restart the server.');
  reset(s);
  s.analysis.enabled = enabled;
}
export function addSamples(s: Session, text: unknown) {
  if (!s.analysis.enabled) throw new Error('Enable AI grouping first.');
  if (typeof text !== 'string' || text.length > 5000) throw new Error('Enter up to 5,000 characters of sample chat.');
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > 20) throw new Error('Enter between 1 and 20 lines in viewer: message format.');
  const messages = lines.map(line => {
    const match = /^([a-zA-Z0-9_]{1,25}):\s*(.{1,500})$/.exec(line);
    if (!match) throw new Error('Each line must use viewer: message (viewer: 1–25 letters, digits or underscores; message: 1–500 characters).');
    return { id: randomUUID(), userId: `sample-${match[1].toLowerCase()}`, username: match[1], text: match[2], at: Date.now() };
  });
  for (const message of messages) ingest(s.engine, message, null);
  s.started = true;
}

export function setScenario(s: Session, value: unknown) {
  if (typeof value !== 'string' || !Object.hasOwn(scenarios, value)) throw new Error('Choose a valid demo scenario.');
  reset(s);
  s.scenario = value as Scenario;
}
