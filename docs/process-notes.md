
### Queue usability improvements
Implemented stable queue selection with manual refresh, session-scoped dismiss/restore, and selectable mixed/repeated/burst demo scenarios. Counts remain live and expire after 60 seconds. Dismissed group identity is retained so incoming messages do not immediately revive it. Changing scenarios aborts pending analysis and resets the demo.

Verification: 22 automated tests passed, TypeScript check and production build passed, and HTTP smoke checks passed including dismiss/restore and scenario reset. Browser checks verified start, dismiss, restore, refresh, and pause controls. Live OpenAI calls remain unverified without credentials.
