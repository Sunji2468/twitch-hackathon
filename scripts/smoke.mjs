import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3000';
const first = await fetch(`${origin}/api/session`);
assert.equal(first.status, 200);
const cookie = first.headers.get('set-cookie').split(';')[0];
let snapshot = await first.json();
const overlayApi = `${origin}/api${snapshot.overlayPath}`;
async function action(action, id) {
  const response = await fetch(`${origin}/api/session`, {
    method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, id }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
try {
  assert.equal(typeof snapshot.analysis.configured, 'boolean');
  assert.equal(snapshot.analysis.enabled, false);
  if (!snapshot.analysis.configured) {
    const rejected = await fetch(`${origin}/api/session`, {
      method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enable-ai' }),
    });
    assert.equal(rejected.status, 400);
    assert.match((await rejected.json()).error, /OPENAI_API_KEY/);
  }
  snapshot = await action('start');
  assert.equal(snapshot.running, true);
  assert.equal(snapshot.queue.length, 3);
  const id = snapshot.queue[0].id;
  snapshot = await action('feature', id);
  const overlay = await (await fetch(overlayApi)).json();
  assert.equal(overlay.featured.id, id);
  assert.deepEqual(Object.keys(overlay).sort(), ['featured', 'mode']);
  snapshot = await action('answer', id);
  assert.equal(snapshot.featured, null);
  assert.equal(snapshot.answered.length, 1);
  assert.equal((await (await fetch(overlayApi)).json()).featured, null);
  snapshot = await action('undo', id);
  assert.ok(snapshot.queue.some(q => q.id === id));
  assert.equal(snapshot.featured, null);
  snapshot = await action('dismiss', id);
  assert.ok(!snapshot.queue.some(q => q.id === id));
  assert.ok(snapshot.dismissed.some(q => q.id === id));
  snapshot = await action('restore', id);
  snapshot = await action('refresh-queue');
  assert.ok(snapshot.queue.some(q => q.id === id));
  snapshot = await action('scenario', 'burst');
  assert.equal(snapshot.scenario, 'burst');
  assert.equal(snapshot.started, false);
  assert.equal(snapshot.dismissed.length, 0);
  snapshot = await action('start');
  assert.equal(snapshot.stats.total, 60);
  const refreshed = await (await fetch(`${origin}/api/session`, { headers: { Cookie: cookie } })).json();
  assert.equal(refreshed.overlayPath, snapshot.overlayPath);
  assert.ok(refreshed.stats.total >= 6);
  const other = await (await fetch(`${origin}/api/session`)).json();
  assert.notEqual(other.overlayPath, snapshot.overlayPath);
  assert.equal(other.started, false);
  assert.equal((await fetch(`${origin}/api/overlay/not-a-token`)).status, 404);
  assert.equal((await fetch(`${origin}/api/session`, {
    method: 'POST', headers: { Origin: 'https://example.com', Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset' }),
  })).status, 403);
  assert.equal((await fetch(`${origin}/api/session`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start' }),
  })).status, 401);
  console.log('PASS: session lifecycle, feature/answer/undo, overlay isolation, refresh persistence, invalid capability, cross-origin rejection, unauthenticated rejection.');
} finally { await action('reset'); }
