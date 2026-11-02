import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, applyResult, classify, createAnalysis, validateResult, type GroupingInput, type GroupingResult } from '../src/lib/grouping';
import { act, createEngine, ingest, queue } from '../src/lib/engine';

const input: GroupingInput = { messages: [{ id: 'a', text: 'Why this hero?' }, { id: 'b', text: 'What made you choose that character?' }, { id: 'c', text: 'LOL' }], groups: [] };
const result: GroupingResult = { groups: [{ existingGroupId: null, title: 'Why did you choose that character?', messageIds: ['a', 'b'] }], ignoredIds: ['c'] };
function seeded() {
  const e = createEngine();
  input.messages.forEach(m => ingest(e, { ...m, userId: m.id === 'b' ? 'a' : m.id, username: 'viewer', at: Date.now() }, null));
  return e;
}
test('validated grouping retains source messages and counts repeated viewer once', async () => {
  const e = seeded(); const state = createAnalysis(true);
  await analyze(e, state, async () => result);
  assert.equal(queue(e, Date.now())[0].count, 1);
  assert.equal(e.messages[2].groupId, undefined);
  assert.equal(state.processed.size, 3);
  assert.equal(e.repeats, 1);
  assert.ok(state.lastSuccess);
});
test('rejects invented IDs, omitted messages, duplicates, empty and oversized titles', () => {
  for (const invalid of [
    { ...result, ignoredIds: ['invented'] },
    { ...result, ignoredIds: [] },
    { ...result, ignoredIds: ['c', 'a'] },
    { ...result, groups: [{ ...result.groups[0], title: '' }] },
    { ...result, groups: [{ ...result.groups[0], title: 'x'.repeat(181) }] },
    { ...result, groups: [{ ...result.groups[0], existingGroupId: 'invented' }] },
    { ...result, groups: [{ ...result.groups[0], messageIds: [] }] },
  ]) assert.throws(() => validateResult(invalid, input));
});
test('invalid output applies no partial groups and backs off without scripted fallback', async () => {
  const e = seeded(); const state = createAnalysis(true);
  await analyze(e, state, async () => ({ ...result, ignoredIds: ['a', 'c'] }));
  assert.equal(e.groups.length, 0);
  assert.equal(state.processed.size, 0);
  assert.ok(state.error); assert.ok(state.nextAttempt > Date.now());
  let calls = 0;
  await analyze(e, state, async () => { calls++; return result; });
  assert.equal(calls, 0);
});
test('one request at a time; an invalidated response does not mutate the old engine', async () => {
  const e = seeded(); const state = createAnalysis(true);
  let resolve!: (value: unknown) => void;
  let current = true;
  const pending = analyze(e, state, () => new Promise(r => { resolve = r; }), Date.now(), () => current);
  let calls = 0;
  await analyze(e, state, async () => { calls++; return result; });
  assert.equal(calls, 0);
  current = false; resolve(result); await pending;
  assert.equal(e.groups.length, 0); assert.equal(state.busy, false);
});
test('abort discards completed response after reset', async () => {
  const e = seeded(); const state = createAnalysis(true);
  let resolve!: (value: unknown) => void;
  const pending = analyze(e, state, () => new Promise(r => { resolve = r; }));
  state.controller!.abort(); resolve(result); await pending;
  assert.equal(e.groups.length, 0); assert.equal(state.error, null);
});
test('answered group is supplied as context and cannot be revived by in-flight assignment', async () => {
  const e = seeded(); const state = createAnalysis(true);
  await analyze(e, state, async () => result);
  const group = e.groups[0];
  ingest(e, { id: 'new', userId: 'new', username: 'new', text: 'Why choose this hero?', at: Date.now() }, null);
  state.nextAttempt = 0;
  let resolve!: (value: unknown) => void;
  const pending = analyze(e, state, input => {
    assert.equal(input.groups[0].id, group.id);
    return new Promise(r => { resolve = r; });
  });
  act(e, 'answer', group.id, Date.now());
  const cooldown = group.cooldownUntil;
  resolve({ groups: [{ existingGroupId: group.id, title: 'Changed title should not replace original', messageIds: ['new'] }], ignoredIds: [] });
  await pending;
  assert.equal(e.groups.length, 1);
  assert.equal(e.groups[0].cooldownUntil, cooldown);
  assert.equal(e.groups[0].title, result.groups[0].title);
  assert.equal(queue(e, Date.now()).length, 0);
});
test('expired messages cannot be resurrected by a late response', async () => {
  const e = seeded(); const state = createAnalysis(true);
  await analyze(e, state, async () => { e.messages.forEach(m => { m.at -= 61_000; }); return result; });
  assert.equal(e.groups.length, 0); assert.equal(e.messages.length, 0);
});
test('bounded batches send text and message IDs, never viewer identities', async () => {
  const e = createEngine(); const state = createAnalysis(true);
  for (let i = 0; i < 45; i++) ingest(e, { id: String(i), text: 'hello', userId: 'private-user', username: 'private-name', at: Date.now() }, null);
  await analyze(e, state, async batch => {
    assert.equal(batch.messages.length, 40);
    assert.ok(!JSON.stringify(batch).includes('private-'));
    return { groups: [], ignoredIds: batch.messages.map(m => m.id) };
  });
  assert.equal(state.processed.size, 40);
});
test('capacity rejection is atomic', () => {
  const e = seeded(); const now = Date.now();
  e.groups = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: 'existing', cooldownUntil: now + 10000 }));
  assert.throws(() => applyResult(e, result, [], now));
  assert.equal(e.groups.length, 100); assert.ok(e.messages.every(m => !m.groupId));
});
test('Responses adapter sends strict schema and rejects refusal, incomplete, HTTP errors', async () => {
  const oldKey = process.env.OPENAI_API_KEY; const oldModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = 'test-only-not-a-key'; process.env.OPENAI_MODEL = 'test-model';
  try {
    const fake = (async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
      assert.equal(body.model, 'test-model');
      assert.ok(body.instructions.includes('untrusted'));
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
    }) as typeof fetch;
    assert.deepEqual(await classify(input, new AbortController().signal, fake), result);
    for (const response of [
      Response.json({ status: 'incomplete', output: [] }),
      Response.json({ status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }),
      new Response('sensitive provider details', { status: 429 }),
      Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: 'not JSON' }] }] }),
    ]) await assert.rejects(classify(input, new AbortController().signal, (async () => response) as typeof fetch), error => error instanceof Error && !error.message.includes('sensitive provider details'));
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = oldModel;
  }
});
