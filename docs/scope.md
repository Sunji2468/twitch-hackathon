# AI Twitch Chat Copilot

## Idea
Turn fast-moving Twitch chat into a live queue of community questions so streamers can answer shared questions and notice otherwise overlooked viewers.

## Who It's For
Streamers whose chat moves too quickly to read while presenting or playing, and viewers whose relevant questions get buried.

## Inspiration & References
- Twitch chatbot example: https://dev.twitch.tv/docs/chat/chatbot-guide/
- Receiving chat messages: https://dev.twitch.tv/docs/chat/send-receive-messages
- EventSub authentication: https://dev.twitch.tv/docs/chat/authenticating
- User-provided hackathon brief: build with Codex, integrate with Twitch, submit source and run instructions, a public YouTube demo of at most three minutes, a project description, and the principal Codex session ID.

Proposed visual direction: a compact, dark streamer dashboard with restrained purple accents, readable question cards, and a transparent OBS overlay. This is a starting assumption, not a stated user preference.

## Goals
- Give streamers a short, actionable queue instead of another feed to monitor.
- Preserve evidence: show original messages behind every question group.
- Demonstrate an actual Twitch-to-streamer-to-overlay interaction.

## What Done Looks Like
1. A streamer connects a Twitch channel.
2. Incoming questions appear in a dashboard and similar questions form groups.
3. The dashboard presents up to three ranked question cards with distinct chatter counts over a displayed rolling window.
4. Each card exposes sample source messages.
5. Featuring a question updates an OBS browser-source overlay.
6. Marking a question answered removes it from the active queue and clears it from the overlay if featured.
   Answered questions have a five-minute suppression period with undo. After expiry, they may return when supported by new recent questions.
7. A clearly labeled demo mode exercises the same grouping and presentation flow without credentials. Live integration is tested separately with real Twitch messages.

Acceptance examples:
- Three differently worded questions about the selected character form one group when semantically equivalent.
- Repetition from one chatter cannot inflate that group's unique-chatter count.
- Unrelated questions remain separate; grouped cards retain real source messages.
- Disconnection and unavailable AI are visible rather than silently presented as healthy operation.

## What's Explicitly Cut
- Automatic moderation and bans: unnecessary for the core interaction.
- Sentiment percentages: uncertain meaning and distracting precision.
- Topic analytics dashboard: expands scope without improving the central demo.
- Paid subscriber prioritization: conflicts with the overlooked-viewer goal.
- Cross-platform integrations: Twitch first.
- Automatic speech-based answer detection: use an explicit Mark answered control.

Optional stretch: a buried-question slot for a relevant chatter not yet featured during the session.

## Technical Experience
The user has experience with Next.js, React, Node.js, Tailwind, PostgreSQL, and Supabase. Use an experienced-developer level of detail in implementation discussions.

Proposed stack: Next.js, React, and Tailwind for the dashboard and browser overlay, with Node.js for chat ingestion and AI processing. Decide whether PostgreSQL/Supabase is needed after defining session persistence requirements.

## Loose Implementation Notes
- Receive Twitch chat through EventSub and implement the appropriate OAuth flow.
- Keep provider credentials and model requests on the server.
- Normalize and suppress repeated per-user input before semantic grouping.
- Treat all chat content as untrusted data, never model instructions.
- Calculate counts and time windows in application code, not in generated prose.
- Batch AI processing and measure observed latency before making scale claims.
- Keep demo and live data distinguishable.
- Restrict overlay output to the featured question; do not expose credentials or dashboard controls through its URL.
- Confirm stack, auth architecture, retention, and answered-question suppression in the technical specification.
