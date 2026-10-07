# How to Use These Files

These four documents are a complete rebuild specification for **GoodGrid**,
written so you can hand them to an AI coding agent (Antigravity or any other)
and get a project that is correct, consistent, and — most importantly —
something *you* can read, explain, and defend in a viva or interview.

## The files, in the order to feed them

1. **01_PRINCIPLES_AND_AI_AGENT_INSTRUCTIONS.md**
   Give this to the agent FIRST, every single session. It is the "rulebook" —
   it tells the agent how to write code (no shortcuts, no placeholders, must
   be understandable), not what to build. If the agent ever starts producing
   vague or incomplete code, paste this file again and ask it to re-check its
   own work against it.

2. **02_BACKEND_SPEC.md**
   The complete backend (Node/Express/MongoDB) specification — folder
   structure, database models, API endpoints, auth flow, sockets, security.
   Build and fully test this before touching the frontend.

3. **03_FRONTEND_SPEC.md**
   The frontend (React/Vite) *structure* — folders, state management,
   routing, what each screen needs to do. Deliberately does **not** include
   visual design (colors, layout, component styling) — you said you're
   researching that separately. There's a clearly marked section in that
   file for where your design decisions will plug in later, so nothing
   needs to be rebuilt when you add them.

## Suggested workflow with Antigravity

1. Start a fresh project/session.
2. Paste file 01 and say: "Follow these rules for everything we build in this
   project. Confirm you understand before we start."
3. Paste file 02, section by section if the agent struggles with the whole
   thing at once (models → auth → requests → chat/sockets → notifications →
   admin). After each section, **run it yourself** and test the endpoints
   (Postman/curl) before moving on. Don't let the agent "build ahead" of what
   you've verified.
4. Once the backend is fully working and you understand it, paste file 03
   and build the frontend the same way — screen by screen.
5. When you've picked your visual design, come back and tell the agent (and
   me, if you want a matching design-tokens file) and it slots into the
   structure already built.

## Why it's split this way

Most "vibe-coded" projects fail at review time not because the app doesn't
run, but because the person who built it can't explain *why* it's built that
way. Splitting rules (01) from backend contract (02) from frontend structure
(03) forces every build session to stay inside a spec you already understand,
instead of letting the agent improvise architecture on the fly.
