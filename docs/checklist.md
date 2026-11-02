# Build Checklist

## Build Preferences
- Git: leave changes reviewable and uncommitted; no user commit preference stated.
- Verification: agent runs automated checks and browser interactions; user reviews visible result.
- Check-ins: concise progress updates. Local prototype first; no publication.

## Checklist
- [ ] **1. Runnable demo workspace and shared overlay**
  Spec ref: `spec.md > Dashboard > Demo Workspace`, `Session Engine > Counting and Actions`, `API > Session Contract`.
  What to build: Next.js foundation, server session engine, deterministic demo adapter, dashboard, answer/undo and OBS browser overlay.
  Acceptance: synthetic traffic is labeled, counts are unique per chatter, feature reaches overlay, answer clears it, undo restores eligibility, refresh retains state.
  Verify: npm test; npm run build; open local dashboard, start demo, feature a card, mark answered, undo, and preview overlay. User visual review pending separately from automated results.
  Status: implementation complete; nine engine tests, HTTP smoke test, production build and browser interactions pass. User visual review pending. Narrow layout inspected; desktop visual QA remains unconfirmed.
- [ ] **2. Twitch sign-in and session lifecycle**
  Spec ref: `spec.md > Live Integrations > Twitch`.
  What to build: OAuth routes, expiring state, token validation/refresh and secure disconnect.
  Acceptance: authenticate own channel, retry failed login, no credentials in browser output.
  Verify: mocked OAuth tests and real sign-in with user-provided app configuration.
- [ ] **3. Live chat ingestion and recovery**
  Spec ref: `spec.md > Live Integrations > Twitch`.
  What to build: EventSub subscription, watchdog, reconnect, deduplication and revocation handling.
  Acceptance: real messages reach dashboard; unhealthy connections are visible.
  Verify: protocol fixture tests followed by real channel messages.
- [ ] **4. Semantic AI grouping**
  Spec ref: `spec.md > Live Integrations > Semantic Grouping`.
  What to build: batched structured output, reference validation, bounded queue, explicit degradation.
  Acceptance: paraphrases group, different answer needs remain separate, cooldown survives paraphrasing.
  Verify: mocked failure tests and live evaluation dataset after API key configuration.
  Status (2026-10-30): AI implementation and sample-chat UI complete; 19 total unit tests and production build pass. Live semantic evaluation is pending OPENAI_API_KEY configuration. User requested this milestone before Twitch integration.
- [ ] **5. Live demo validation and polish**
  Spec ref: `spec.md > Review Findings`.
  What to build: measure latency and capacity, verify OBS and test channel, refine accessibility and responsiveness.
  Acceptance: all demo acceptance criteria in PRD have recorded evidence or an explicit limitation.
  Verify: full real Twitch to overlay walkthrough and mobile inspection.
- [ ] **6. Prepare submission video**
  Spec ref: `prd.md > Demo Acceptance`.
  What to build: script and record a maximum three-minute video showing Twitch integration and Codex use.
  Acceptance: public YouTube video, repo/run instructions, project description and principal Codex session ID ready.
  Verify: user watches final recording; publication only as authorized.
