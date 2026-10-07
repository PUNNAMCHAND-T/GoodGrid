# GoodGrid — Engineering Principles & AI Agent Instructions

**Read this before writing any code.** These rules apply to every file, in
every phase of the build. They exist because this project will be rebuilt by
an AI agent but owned, explained, and maintained by a final-year BTech
student — so "it runs" is not good enough. "I can explain every line of it"
is the bar.

---

## 1. Non-negotiable rules for the AI agent

These are hard constraints. If a rule below conflicts with speed or
convenience, the rule wins.

1. **No placeholder or stub logic left behind.** Never write `// TODO:
   implement later`, `return null // fake for now`, or a function that looks
   complete but silently does nothing. If something genuinely can't be built
   yet (e.g. it needs a paid API key), say so explicitly in the code comment
   AND in the chat response — don't hide it inside working-looking code.
2. **No swallowed errors.** Never write an empty `catch {}` block or a
   `catch` that only logs and moves on when the caller needs to know it
   failed. Every error either gets handled meaningfully or re-thrown/passed
   to the error handler.
3. **No hardcoded secrets, keys, or credentials** anywhere in source files.
   Everything sensitive comes from `.env`, and a `.env.example` (with no real
   values) must exist alongside it.
4. **No skipped input validation.** Every route that accepts a body, query,
   or param validates it (type, required fields, ranges/enums) before
   touching the database. Reject invalid input with a clear 4xx error, don't
   let bad data reach MongoDB.
5. **No unexplained "magic."** No hardcoded numbers, roles, or strings
   scattered through the code — put them in one constants file and reference
   them by name.
6. **No shortcuts that skip a stated feature.** If the spec says "reject
   duplicate volunteer applications," the code must actually enforce that
   (e.g. a unique compound index + a checked error), not just hope it
   doesn't happen.
7. **Every function/file gets a short comment explaining *why*, not just
   *what*.** `// hashes the password before save so plaintext never touches
   the DB` is useful. `// hashes password` restates the code and isn't
   enough on its own — pair it with the "why" where it isn't obvious.
8. **One responsibility per file/function.** A controller function talks to
   the request/response and delegates logic; it doesn't also format emails,
   query three unrelated collections, and compute stats in the same 80-line
   block. Split it.
9. **Consistent patterns across the codebase.** If one controller uses
   `asyncHandler` + `ApiError`, every controller does. If one route validates
   with `express-validator`, all of them do. No mixing styles between files
   written in different sessions.
10. **Ask before assuming when the spec is ambiguous.** If file 02 or 03
    doesn't specify something the agent needs to decide, it should say what
    it's assuming and why — not silently pick something and move on.

## 2. What "understandable by the user" means in practice

The student reading this code later should be able to answer, for any file:
- What does this file do, in one sentence?
- Why does it live here and not somewhere else?
- What would break if I deleted it?

To make that possible, the agent must:
- Keep names literal and specific (`getNearbyRequests`, not `handleReq2`).
- Add a 2–4 line comment block at the top of every non-trivial file stating
  its purpose and how it fits into the request lifecycle.
- Avoid clever one-liners that trade readability for brevity (no nested
  ternaries three levels deep, no chained `.reduce()` gymnastics where a
  `for` loop or two lines would read better).
- Explain any library-specific "gotcha" inline (e.g. GeoJSON wanting
  `[lng, lat]` instead of `[lat, lng]` — this exact mistake is easy to make
  in this project, so call it out wherever coordinates are handled).

## 3. Reliability requirements

- **Fail fast on missing configuration.** The server must refuse to start
  (with a clear error message naming the missing variable) rather than run
  with an undefined `JWT_ACCESS_SECRET` and fail confusingly later.
- **Idempotent, safe defaults.** Optional features (Cloudinary, Google OAuth,
  SMTP email) must degrade gracefully — the app still runs and says clearly
  in the console/logs that a feature is disabled, instead of crashing or
  silently pretending it worked.
- **Every list endpoint is paginated** (page/limit with sane defaults and
  max limits) — never return an unbounded array from the database.
- **Every write endpoint is transactional where it touches more than one
  collection** (e.g. accepting a volunteer touches the request, the
  application, the chat, and notifications — if one step fails, the others
  shouldn't leave the data half-updated).
- **Rate limiting and auth checks happen in middleware, not copy-pasted
  inside each controller.**

## 4. Testing expectation

Full automated test coverage isn't required for a student project, but the
agent must:
- Write at least one test (or a documented manual test with example
  curl/Postman requests) per API endpoint — request in, expected response
  out, including the main failure case (bad input / unauthorized).
- Never claim a feature "works" without showing how it was verified.

## 5. Build phases (build and verify each before moving on)

1. **Project skeleton** — folder structure, `.env.example`, env validation,
   `npm run dev` boots with a working `/health` route. Nothing else yet.
2. **Database models** — all six schemas from the backend spec, with
   validation and indexes. Verify by inserting/reading test documents.
3. **Auth** — register, login, refresh, logout, `GET /auth/me`. Verify with
   a real signup → login → protected-route → refresh → logout cycle.
4. **Users & profile** — profile read/update, avatar upload. Verify.
5. **Requests** — full CRUD + geospatial "nearby" search + status lifecycle.
   Verify each status transition and its side effects.
6. **Volunteers & notifications** — apply, accept/reject, notifications
   created on every relevant event. Verify with two test accounts.
7. **Chat & sockets** — chat creation on volunteer acceptance, real-time
   messages, typing indicators, HTTP fallback. Verify with two browser
   tabs/two accounts.
8. **Admin** — stats, user ban/role management, request moderation. Verify
   with a non-admin account correctly getting a 403.
9. **Frontend skeleton** — routing, layouts, protected/public routes, Redux
   store, axios instance with silent refresh. Verify navigation and auth
   redirects with no styling yet.
10. **Frontend features** — one page at a time, wired to the real backend,
    matching file 03. Verify each page against its backend endpoints before
    moving to the next.
11. **Visual design pass** — only after you've finalized your design
    research, add styling/theme. Nothing built above should need to be
    restructured for this.

After each phase, do not proceed until you (the student) have personally run
the feature and understood why it works — not just watched the agent say it
does.

## 6. What to do if the agent produces something you don't understand

Stop. Ask it to explain the specific lines in plain language, or to rewrite
that section more simply. Don't accept "it's a standard pattern" as an
explanation — ask what problem the pattern solves here.
