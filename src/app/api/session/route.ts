import { NextRequest, NextResponse } from 'next/server';
import { reset, session, snapshot, start, setAI, addSamples, setScenario } from '@/lib/store';
import { act, refreshQueue } from '@/lib/engine';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  try { const s = await session(true); return NextResponse.json(snapshot(s!), { headers }); }
  catch { return NextResponse.json({ error: 'Unable to create a session. Restart the local server if its session capacity is full.' }, { status: 503, headers }); }
}
export async function POST(req: NextRequest) {
  // Next can normalize nextUrl to localhost even when the browser uses 127.0.0.1.
  // Compare the browser's origin to the actual Host, and permit only local hosts.
  const origin = req.headers.get('origin');
  let sameOrigin = false;
  try {
    const url = new URL(origin ?? '');
    sameOrigin = url.host === req.headers.get('host') && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol);
  } catch { /* Missing and malformed origins are rejected. */ }
  if (!sameOrigin) return NextResponse.json({ error: 'Request origin rejected.' }, { status: 403, headers });
  if (!req.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ error: 'Expected JSON.' }, { status: 415, headers });
  const s = await session();
  if (!s) return NextResponse.json({ error: 'Session expired. Refresh the dashboard.' }, { status: 401, headers });
  try {
    const text = await req.text();
    if (text.length > 7000) throw new Error('Request too large.');
    const { action, id, sampleText } = JSON.parse(text);
    if (id !== undefined && (typeof id !== 'string' || id.length > 100)) throw new Error('Invalid question.');
    if (action === 'enable-ai') setAI(s, true);
    else if (action === 'disable-ai') setAI(s, false);
    else if (action === 'samples') addSamples(s, sampleText);
    else if (action === 'scenario') setScenario(s, id);
    else if (action === 'refresh-queue') refreshQueue(s.engine, Date.now());
    else if (action === 'start') start(s);
    else if (action === 'pause') s.running = false;
    else if (action === 'reset') reset(s);
    else if (['feature', 'unfeature', 'answer', 'undo', 'dismiss', 'restore'].includes(action)) act(s.engine, action, id, Date.now());
    else throw new Error('Unknown action.');
    return NextResponse.json(snapshot(s), { headers });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to apply action.' }, { status: 400, headers }); }
}
