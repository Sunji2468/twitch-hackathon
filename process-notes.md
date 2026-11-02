# Process Notes

## /scope

- The user proposed an AI Twitch Chat Copilot with grouping, alerts, spam detection, sentiment, priority messages, and topic analytics.
- Feedback recommended concentrating on grouped community questions, original-message evidence, and feature/answered controls for a visible live interaction.
- The user said to get started following that recommendation. The scope records this direction; individual implementation and aesthetic choices remain proposals.
- Key accuracy decisions: count distinct chatters within an explicit window, avoid inferred sentiment percentages, and distinguish repeated emote participation from abuse.
- The workspace was empty apart from Git metadata. Created the initial project scope before implementation.
- Technical experience, preferred stack, and available Twitch test channel are not yet known.
- No application code or live integration has been implemented or verified yet.

- The user described experience with Next.js, React, Node.js, Tailwind, PostgreSQL, and Supabase. Proposed using that familiar stack; persistence requirements remain to be defined.

## /prd

- Beginning product behavior definition from the existing scope.
- The first unresolved interaction is what happens when an answered question is asked again. Proposed default: a five-minute suppression period with manual undo, followed by eligibility to return if new messages support it. Awaiting user input; this is not a finalized requirement.
- The user accepted the five-minute cooldown with undo. This supersedes the pending status above.
- Created docs/prd.md with observable acceptance criteria for connecting, grouping, ranking, featuring, answering, undoing, and handling failure states.
- Distinguished accepted behavior from proposed defaults, including the 60-second counting window and session-only persistence. No further approval was inferred for deployment or external actions.
- Clarified two interactions: answering the featured question clears its overlay; undo restores eligibility but does not automatically feature it again.
- Product requirements are documented; implementation and live verification have not started.

## /spec
- The user asked to start implementation. Selected the familiar Next.js/React/Node/Tailwind stack and a local-first, single-process architecture as an implementation default.
- Created docs/spec.md; deferred a database because the initial session requires no historical storage.
- Resolved the overlay trust boundary with a separate read-only capability and server-owned counts/state.
- Reviewed current Next.js, Tailwind, Twitch and OpenAI documentation. No credentials or external API calls were needed for the demo implementation.

## /checklist
- Created six milestones, beginning with a runnable demo and shared overlay, followed by OAuth, EventSub, semantic grouping, live validation, and submission video.
- Did not infer user approval for publication or claim live integration was done.

## /build
### Step 1: Runnable demo workspace and shared overlay
- Implemented the Next.js dashboard, bounded server session engine, deterministic simulated traffic, three-card queue, source evidence, feature/unfeature, five-minute answer cooldown, undo, and transparent overlay page.
- Demo is explicitly labeled as simulated with rule-based grouping. Connect Twitch currently opens an honest setup/status dialog; it does not perform OAuth.
- Nine engine tests pass, covering distinct counts, duplicate event delivery, window expiry, stable featured snapshots, cooldown, undo, independent answers, evidence and capacity.
- Production build passes using webpack; Turbopack failed on this host's internal compiler-port handling. package.json uses the verified webpack build command.
- HTTP smoke test passes: session lifecycle, overlay payload isolation, separate browser sessions, feature/answer/undo, invalid capability, missing-session rejection and cross-origin rejection.
- Browser verified startup, feature in a separate overlay tab, answer clearing the overlay, cooldown display, undo, re-feature, source expansion, and persistence after reload/hydration.
- Browser testing found and fixed an origin check mismatch caused by Next.js localhost normalization, plus countdown formatting near a minute boundary.
- Inspected the narrow responsive layout. Browser viewport override did not produce a reliable wider view in the in-app browser, so desktop visual QA remains to be confirmed.
- Preview running at http://127.0.0.1:3000. Saved screenshot in docs/demo-preview.png.
- User visual review and knowledge check have not occurred; do not attribute agent verification to the user. Twitch, AI, and real OBS application verification remain outstanding.


### AI grouping — 2026-10-30
- User explicitly requested AI grouping next, before Twitch authentication; followed that scope rather than the earlier checklist order.
- Added an OpenAI Responses adapter with strict structured outputs, server-only key/model configuration, bounded batches, no overlapping calls per session, timeout and exponential backoff.
- Every input ID must be assigned exactly once to a question or ignored list. Invalid outputs apply no partial changes. Distinct counts and quotes remain application-owned.
- Included existing cooldown groups as context, preserved answer/undo state during in-flight calls, discarded reset/mode-change results, and prevented expired messages from being resurrected.
- Added AI mode controls, pending/error/last-success status, and custom synthetic chat submission. Switching mode explicitly clears the queue and overlay. Scripted mode remains available and clearly labeled.
- Added .env.example and a live evaluation command using synthetic paraphrases, distinct answer needs, cooldown reuse, reactions, and prompt injection. No .env.local or API key is currently configured, so no live OpenAI call was made.
- Verification: 19 automated tests pass (10 new grouping/protocol tests), production build passes, existing HTTP smoke checks pass. These mocked tests verify correctness of application handling, not semantic model accuracy.
- Added HTTP verification that AI enable is rejected without key/model configuration. TypeScript checking also passes.
- Browser inspection confirmed the AI setup copy and disabled enable control without a key. Turbopack repeatedly refreshed this host's preview; switched the dev script to webpack and verified the restarted server via HTTP. Browser tooling then failed to reattach, so full interactive browser QA for the new controls remains unverified.
