# AI Twitch Chat Copilot — Product Requirements

## Problem Statement
Streamers cannot reliably read fast-moving chat while playing or presenting. Similar questions arrive in different words, while thoughtful individual questions can disappear among reactions and repeated messages. The copilot gives the streamer a small, evidence-backed question queue and a way to bring those questions onto the stream.

## Decisions and Working Defaults
- Agreed MVP: live Twitch chat, semantic question grouping, three ranked cards with original messages, feature-on-stream and mark-answered controls.
- Agreed answer behavior: suppress an answered question for five minutes, support undo, and allow it to return if new viewers continue asking.
- Working defaults below are implementation proposals rather than individually approved user preferences: a rolling 60-second counting window, one connected channel per session, no historical chat analytics, and a compact dark dashboard.
- A successful demo must include real Twitch messages; simulated traffic is labeled separately.

## User Stories

### Starting a Session
As a streamer, I want to connect my Twitch channel so that questions come from my actual audience.
- [ ] The initial screen offers Connect Twitch and Try demo.
- [ ] Successful connection displays the channel and a distinct Live indicator.
- [ ] Cancelled or failed connection leaves a retry action and an understandable error.
- [ ] Connected with no messages is distinct from disconnected.
- [ ] A disconnected or reconnecting session does not claim its data is current.
- [ ] Disconnect stops new ingestion for the session and clears the featured overlay.

As a demo presenter, I want to try a complete example without credentials so that I can explain the experience immediately.
- [ ] Demo mode visibly identifies all traffic as simulated.
- [ ] The example includes paraphrased questions, unrelated questions, repeated messages from one person, and ordinary emote reactions.
- [ ] Demo messages use the same queue and interaction flow as live messages.
- [ ] Controls allow starting, pausing, and resetting the demo.
- [ ] Switching between demo and live clears the previous mode's questions and featured output so counts never mix.

### Understanding Community Questions
As a streamer, I want related questions grouped so that one answer can address multiple people.
- [ ] Semantically equivalent questions form one card even when phrased differently.
- [ ] Questions about the same subject with different answer needs remain separate; character choice and character abilities are not automatically merged.
- [ ] A card contains a concise question, the number of distinct chatters, the counting window, and up to three original messages with names.
- [ ] Counts reflect observed messages from the last 60 seconds, not all viewers watching the stream.
- [ ] One chatter contributes at most one count to a particular group within the window.
- [ ] Duplicate delivery of the same message does not inflate counts or duplicate examples.
- [ ] Source examples support the displayed question; the system never invents quotes or usernames.
- [ ] Expired messages cease contributing to counts. A group with no recent messages leaves the active queue unless currently featured.
- [ ] Emote-only reactions do not become question cards or automatically trigger moderation.

As a streamer, I want a short, stable queue so that I can glance at it while streaming.
- [ ] At most three eligible cards appear in the primary queue.
- [ ] Rank primarily by distinct recent chatters, using recent activity to break ties.
- [ ] Refresh in batches rather than rearranging on every incoming message.
- [ ] Updates never change which question an already-initiated action applies to.
- [ ] Empty state reads as waiting for questions, not as a broken or disconnected service.
- [ ] A currently featured question stays identifiable even when rankings change.
- [ ] There is no subscriber-payment or message-length ranking boost.

### Featuring a Question on Stream
As a streamer, I want to feature a question so that viewers can see what I am answering.
- [ ] Feature displays the chosen question in a browser-source overlay and marks it featured in the dashboard.
- [ ] Only one question is featured at a time; featuring another replaces the first.
- [ ] The overlay uses a transparent background outside the question card.
- [ ] The streamer can copy an overlay URL and see concise instructions for using it as an OBS browser source.
- [ ] Unfeature removes the overlay card without marking the question answered.
- [ ] A featured question stays visible until replaced, unfeatured, answered, or the session ends, even if its messages age out of the counting window.
- [ ] The overlay shows the question and a clearly labeled count captured when featured; it does not imply a frozen count is live.
- [ ] The overlay exposes no dashboard actions, provider credentials, or raw message feed.

### Answering and Undoing
As a streamer, I want answered questions to leave the queue so that I can move on to other people.
- [ ] Mark answered immediately removes that group from the eligible queue.
- [ ] Answering the featured question also clears the overlay; answering another question does not affect the featured one.
- [ ] The group enters a five-minute cooldown starting at the answer action.
- [ ] Equivalent questions arriving during cooldown cannot bypass it by creating another eligible group.
- [ ] Repeated answer actions do not accidentally extend the cooldown.
- [ ] Answered items remain accessible in a compact session list with their cooldown status and an Undo action.

As a streamer, I want to undo an accidental answer action so that I do not lose a useful question.
- [ ] Undo cancels the cooldown and returns the question to normal eligibility when it has recent supporting messages.
- [ ] Undo does not automatically feature the question or replace another featured question.
- [ ] If all its messages have aged out, undo reports that it is waiting for new activity rather than fabricating a current count.
- [ ] When a cooldown expires, a question returns only if supported by messages in the current rolling window; old pre-answer messages cannot revive it.
- [ ] Returning groups count only current distinct chatters and compete under normal ranking rules.

### Trust and Failure States
As a streamer, I want to know when results are delayed or unavailable so that I do not mistake stale output for audience feedback.
- [ ] Connection status and last successful analysis time are visible.
- [ ] AI failure displays a degraded state and retry behavior; fabricated or silently substituted AI summaries are never presented as successful output.
- [ ] Existing cards remain readable during a temporary failure with a stale indicator; their displayed time context remains accurate.
- [ ] Input that attempts to instruct the AI is treated as audience content, not authority to change application behavior.
- [ ] Raw chat and credentials are not exposed in a public overlay or routine error messages.
- [ ] Action failures are visible, and controls do not claim success before the shared session state accepts the action.

### Session Continuity
Proposed MVP behavior, to be implemented consistently across the dashboard and overlay:
- [ ] Refreshing a dashboard while its server session is active preserves the queue, featured question, and cooldowns.
- [ ] Ending a session clears its active chat data and overlay.
- [ ] Restarting the server may end an active session in the initial local prototype; reconnection is explicit.
- [ ] No historical chat archive or cross-stream analytics is required.

## What We're Building
1. A dashboard with live and demo entry paths, connection health, and three evidence-backed question cards.
2. A bounded recent-message grouping flow with code-calculated distinct-chatter counts.
3. Feature, unfeature, answered, and undo interactions shared with an OBS-compatible overlay.
4. Five-minute answered-question suppression with recent-activity eligibility after expiry.
5. A repeatable demo scenario, run instructions, and live Twitch validation instructions.

## Demo Acceptance
- [ ] Send differently phrased questions from real Twitch accounts and show a supported group in the dashboard.
- [ ] Show that repetition by one account cannot inflate its unique-chatter count.
- [ ] Feature the question and show the overlay update.
- [ ] Mark it answered and show both removal and cooldown.
- [ ] Undo an answer action and demonstrate the resulting eligibility.
- [ ] Show an unrelated question remaining separate.
- [ ] Use labeled simulated traffic for volume demonstrations and disclose the test volume and environment instead of claiming unmeasured capacity.
- [ ] Record observed chat-to-card latency during testing; a tentative target is within ten seconds under the defined demo load, not a guaranteed production SLA.

## What We'd Add With More Time
- A buried-question slot for a relevant chatter not yet featured in the session.
- Persistent session recovery and saved preferences across server restarts.
- Manual splitting or combining of incorrect groups.
- Streamer-customizable cooldown and overlay appearance.

## Non-Goals
- Automatic bans or moderation actions: keep the MVP focused on questions.
- Sentiment percentages or a topic analytics dashboard: avoid uncertain metrics and scope expansion.
- Multi-platform and multi-channel aggregation: validate the Twitch interaction first.
- Automatic speech recognition for detecting answers: explicit streamer actions are sufficient.
- Answering viewers on behalf of the streamer or automatically posting to chat: the streamer controls the interaction.

## Open Questions
- Before live testing: which Twitch test channel and additional participant accounts are available?
- During specification: select a deployment model that supports continuous chat ingestion and shared dashboard/overlay state.
- During specification: define authentication, overlay access, credential handling, and bounded retention.
- Before final visual polish: confirm whether the proposed dark/purple direction fits the user's taste.

These questions do not block defining the core product behavior. Account secrets should be supplied through local environment configuration rather than chat.
