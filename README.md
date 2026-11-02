# Chat Copilot

A streamer workspace that turns fast-moving chat into a short question queue, with source messages, unique-chatter counts, and an OBS overlay.

## Current milestone

The local prototype includes optional **AI question grouping through OpenAI Responses**. Scripted mode remains the no-key default. AI mode groups unlabelled simulated chat or custom samples by meaning. Twitch OAuth and EventSub are still planned; Connect Twitch explains that status rather than pretending to connect.

Implemented: start/pause/reset demo, rolling 60-second counts, three ranked cards, source-message expansion, feature/unfeature, mark answered, five-minute cooldown, undo, and a separate transparent browser overlay. The server owns state; refresh does not reset it.

## Run

Requires Node.js 20.9 or newer (developed with Node 22).

```sh
npm install
npm run dev
```

Open the Local URL printed by Next.js. No credentials are needed for demo mode.

```sh
npm test
npm run typecheck
npm run build
npm start
```

With the dev server running, `node scripts/smoke.mjs` verifies the HTTP session lifecycle, overlay isolation, and cross-origin protections. Development and production scripts use Next.js's supported webpack compiler because this host encountered Turbopack internal-port and repeated-refresh issues.

## Try the flow

1. Start demo and watch questions collect into cards.
2. Expand source messages and compare the distinct-chatter count.
3. Feature a question; use Set up overlay → Open preview to see the separate output.
4. Mark it answered; the overlay clears and the question moves to Answered for five minutes.
5. Undo; it becomes eligible again if its messages are still within the 60-second window.
6. Pause the demo; messages age out naturally. Reset clears the session and featured output.

## OBS

Set up overlay provides a read-only capability URL for this session. Add it as an OBS Browser Source at 1920 × 1080. The page is transparent apart from the featured card. Keep the capability URL private: anyone with it can view the featured question, but cannot control the session. Counts are frozen and labeled "when featured"; demo output is marked DEMO. Use the same host consistently (127.0.0.1 and localhost have separate browser cookies).

## Runtime limits

- Single-process, local-first prototype. Do not deploy in serverless or multiple replicas without externalizing the session store and ingestion worker.
- Server restart clears sessions; inactive dashboards expire after two hours. Overlay polling does not keep a session alive indefinitely.
- Maximum 50 browser sessions, 2,000 recent messages and 100 groups per session; message/group saturation produces a visible warning.
- Source messages are retained for at most 60 seconds. Cooldown metadata persists for five minutes; a featured snapshot remains until explicitly cleared or the session ends.
- Automated AI tests use mocked model responses and establish protocol/state correctness, not model accuracy. Run the live evaluation below to check semantic behavior with your configured model. No production volume or latency claim has been validated.
- Live Twitch and OBS application verification still need to be performed; testing the browser overlay is not a substitute for live Twitch validation.

## Planning

See [scope](docs/scope.md), [requirements](docs/prd.md), [architecture](docs/spec.md), and [build checklist](docs/checklist.md). Credentials for future integrations belong in ignored local environment files, never committed to Git or pasted into chat.

## Enable AI grouping

1. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` and `OPENAI_MODEL`. The example uses `gpt-4.1-mini`; select a Responses/structured-output model available to your API project.
2. Restart `npm run dev` so the server loads your configuration.
3. Click **Enable AI grouping**. Switching modes resets the queue, featured card, and cooldowns.
4. Start demo traffic, or expand **Try your own sample chat** and submit lines such as:

```text
alice: Why did you choose that character?
bob: What made you pick that hero?
alice: Why that character?
carol: How does the ultimate ability work?
dave: LOL
```

Sample messages are analyzed even when the demo generator is paused. Viewer names are used locally for distinct-chatter counts; only message IDs/text and existing question titles/source text are sent to OpenAI. Message text itself may contain personal data, so use synthetic samples for evaluation. API usage applies. The client receives only configuration booleans, never credentials.

The server processes at most 40 messages per batch, one in-flight request per session, with at least five seconds between successful requests. Requests time out after 20 seconds. Errors back off from 10 seconds to a maximum of 60 seconds and remain visible, with no silent fallback. Analysis stops issuing new requests after 30 seconds without a dashboard heartbeat. Pending messages age out after 60 seconds like other chat; this prototype does not promise lossless processing during overload or outages.

Every response must assign each submitted message ID exactly once to a group or the ignored list. Unknown IDs, repeated assignments, empty groups and oversized titles reject the whole result. Counts and displayed examples come from the application, not the model. Existing groups (including cooldown groups) are sent as context; matching quality depends on the model and is checked by the live evaluation. Reset/mode changes abort work and discard stale responses; an answer action during a request remains authoritative.

### Verify AI behavior

```sh
npm test
npm run build
npm run eval:grouping
```

The final command makes one real API call with synthetic examples. It checks paraphrases, distinct answer needs, reuse of an answered-question group, reactions, and instruction-injection resistance. It reports observed latency; passing this small fixture is not a production accuracy guarantee. If no API key is configured, live evaluation remains outstanding.

Implementation: `src/lib/grouping.ts`. Protocol/state tests: `tests/grouping.test.ts`. Official reference: https://developers.openai.com/api/docs/guides/structured-outputs

### Queue controls and demo scenarios

- The first questions populate the queue automatically. After that, their order stays fixed while counts and source messages update. **Refresh queue** selects the current top three questions. Expired cards remain visible with zero recent chatters until refreshed; they cannot be featured.
- **Dismiss question** hides a topic for this session and clears it from the overlay if featured. Repeated messages for that group stay hidden. Restore it from **Dismissed**; refresh the queue if it is no longer in the visible selection. Reset clears dismissals.
- Choose **Mixed topics** (6 messages per batch), **Repeated questions** (20, including 16 from one chatter), or **Chat burst** (60). Batches arrive approximately every three seconds. Switching scenarios clears the queue, overlay, and cooldowns and pauses the demo. Press Start demo to begin.
- Scenarios work with scripted or AI grouping. Scripted mode makes no API calls; AI mode requires configured credentials.

# twitch-hackathon
