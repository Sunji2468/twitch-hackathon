import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, cards, COOLDOWN_MS, createEngine, ingest, queue, WINDOW_MS } from '../src/lib/engine';
import { demoBatch } from '../src/lib/demo';

const topic = { id: 'choice', title: 'Why did you choose that character?' };
const message = (id: string, userId: string, at: number) => ({ id, userId, username: userId, text: 'Why this character?', at });
test('75 repeated questions by one chatter count once; replayed event is ignored', () => {
  const e = createEngine();
  for (let i = 0; i < 75; i++) ingest(e, message(`${i}`, 'one', 1000 + i), topic);
  ingest(e, message('74', 'one', 1074), topic);
  ingest(e, message('other', 'two', 1100), topic);
  assert.equal(queue(e, 1100)[0].count, 2);
  assert.equal(e.total, 76);
  assert.equal(e.repeats, 74);
});
test('rolling window removes individual chatters and empty groups', () => {
  const e = createEngine();
  ingest(e, message('old', 'one', 1000), topic);
  ingest(e, message('new', 'two', 2000), topic);
  assert.equal(queue(e, 1000 + WINDOW_MS)[0].count, 1);
  assert.equal(queue(e, 2000 + WINDOW_MS).length, 0);
});
test('answer clears featured card and cannot be extended by repeated clicks', () => {
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  act(e, 'feature', topic.id, 1000);
  act(e, 'answer', topic.id, 2000);
  const deadline = e.groups[0].cooldownUntil;
  act(e, 'answer', topic.id, 3000);
  assert.equal(e.featured, null);
  assert.equal(e.groups[0].cooldownUntil, deadline);
  assert.equal(queue(e, 3000).length, 0);
});
test('cooldown suppresses new supporting messages and returns only recent counts', () => {
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  act(e, 'answer', topic.id, 2000);
  ingest(e, message('b', 'two', 2000 + COOLDOWN_MS - 1000), topic);
  assert.equal(queue(e, 2000 + COOLDOWN_MS - 1).length, 0);
  assert.equal(queue(e, 2000 + COOLDOWN_MS)[0].count, 1);
});
test('undo restores eligibility but does not re-feature; expired sources stay expired', () => {
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  act(e, 'answer', topic.id, 2000);
  act(e, 'undo', topic.id, 3000);
  assert.equal(queue(e, 3000)[0].count, 1);
  assert.equal(e.featured, null);
  act(e, 'answer', topic.id, 4000);
  act(e, 'undo', topic.id, 1000 + WINDOW_MS);
  assert.equal(queue(e, 1000 + WINDOW_MS).length, 0);
});
test('featured snapshot stays stable after counting window expires', () => {
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  act(e, 'feature', topic.id, 1000);
  assert.equal(queue(e, 1000 + WINDOW_MS).length, 0);
  assert.equal(e.featured?.count, 1);
  act(e, 'unfeature', undefined, 1000 + WINDOW_MS);
  assert.equal(e.featured, null);
});
test('answering a different question preserves the featured question', () => {
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  ingest(e, message('b', 'two', 1000), { id: 'schedule', title: 'Next stream?' });
  act(e, 'feature', topic.id, 1000);
  act(e, 'answer', 'schedule', 1001);
  assert.equal(e.featured?.id, topic.id);
});
test('demo produces evidenced cards and excludes reactions', () => {
  const e = createEngine();
  for (let i = 0; i < 10; i++) demoBatch(e, i, 1000 + i * 2500);
  assert.equal(queue(e, 30000).length, 3);
  assert.ok(e.messages.some(m => !m.groupId));
  for (const card of cards(e, 30000)) {
    assert.equal(card.count, new Set(e.messages.filter(m => m.groupId === card.id).map(m => m.userId)).size);
    assert.ok(card.examples.every(m => e.messages.includes(m)));
  }
});
test('message capacity stays bounded and warns instead of inflating counts', () => {
  const e = createEngine();
  for (let i = 0; i < 2001; i++) ingest(e, message(`${i}`, `${i}`, 1000), topic);
  assert.equal(e.messages.length, 2000);
  assert.equal(queue(e, 1000)[0].count, 2000);
  assert.equal(e.capacity, true);
});

test('visible queue keeps order and expired cards until an explicit refresh', async () => {
  const { visibleQueue, refreshQueue } = await import('../src/lib/engine');
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  assert.deepEqual(visibleQueue(e, 1000).map(g => g.id), [topic.id]);
  const other = { id: 'other', title: 'Next stream?' };
  ingest(e, message('b', 'two', 1100), other);
  ingest(e, message('c', 'three', 1100), other);
  assert.deepEqual(visibleQueue(e, 1100).map(g => g.id), [topic.id]);
  refreshQueue(e, 1100);
  assert.deepEqual(visibleQueue(e, 1100).map(g => g.id), ['other', topic.id]);
  assert.equal(visibleQueue(e, 62000)[0].count, 0);
  assert.throws(() => act(e, 'feature', 'other', 62000));
  refreshQueue(e, 62000);
  assert.equal(visibleQueue(e, 62000).length, 0);
});
test('dismiss hides a topic, clears its overlay, survives expiry and can be restored', async () => {
  const { visibleQueue } = await import('../src/lib/engine');
  const e = createEngine();
  ingest(e, message('a', 'one', 1000), topic);
  visibleQueue(e, 1000);
  act(e, 'feature', topic.id, 1000);
  act(e, 'dismiss', topic.id, 1001);
  assert.equal(e.featured, null);
  assert.equal(visibleQueue(e, 1001).length, 0);
  assert.equal(queue(e, 1001).length, 0);
  assert.throws(() => act(e, 'feature', topic.id, 1001));
  ingest(e, message('b', 'two', 70000), topic);
  assert.equal(queue(e, 70000).length, 0);
  act(e, 'restore', topic.id, 70001);
  assert.equal(queue(e, 70001)[0].count, 1);
});
test('demo scenarios produce distinct traffic and no future timestamps', () => {
  for (const [scenario, size] of [['mixed', 6], ['repeated', 20], ['burst', 60]] as const) {
    const e = createEngine();
    demoBatch(e, 0, 1000, true, scenario);
    assert.equal(e.total, size);
    assert.ok(e.messages.every(m => m.at === 1000));
    if (scenario === 'repeated') {
      assert.equal(queue(e, 1000).length, 1);
      assert.equal(queue(e, 1000)[0].count, 5);
      assert.equal(e.repeats, 15);
    }
    const ai = createEngine();
    demoBatch(ai, 0, 1000, false, scenario);
    assert.ok(ai.messages.every(m => !m.groupId));
  }
});
