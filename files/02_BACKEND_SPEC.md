# GoodGrid — Backend Specification (Node / Express / MongoDB)

Build this against the rules in `01_PRINCIPLES_AND_AI_AGENT_INSTRUCTIONS.md`.
Every endpoint below must be fully implemented — no partial features, no
endpoints that return mock data.

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 18+ |
| HTTP framework | Express 4 |
| Database | MongoDB Atlas (M0 free tier) via Mongoose 8 |
| Realtime | Socket.IO 4 |
| Auth | JWT (access + refresh) via `jsonwebtoken`, passwords via `bcryptjs` |
| OAuth (optional) | Passport.js, Google OAuth 2.0 strategy |
| File upload | Multer (memory storage) → Cloudinary SDK 2 |
| Email | Nodemailer |
| Security | Helmet, CORS, express-rate-limit |
| Validation | express-validator |
| Logging | Morgan |

Keep dependency versions current at build time; don't pin to versions known
to have unpatched CVEs.

## 2. Folder structure

```
server/
  server.js                  # HTTP + Socket.IO entrypoint (not imported in tests)
  seed.js                    # demo data seeding script
  .env.example
  src/
    app.js                   # Express app + middleware stack (testable, no listen())
    config/
      env.js                 # validates all required env vars at startup, exits if missing
      db.js                  # Mongo connection with reconnect/backoff logic
      cloudinary.js           # Cloudinary init (no-op gracefully if unset)
    models/
      User.js
      Request.js
      Chat.js
      Message.js
      Notification.js
      VolunteerApplication.js
    controllers/
      auth.controller.js
      user.controller.js
      request.controller.js
      volunteer.controller.js
      chat.controller.js
      notification.controller.js
      admin.controller.js
    routes/
      index.js               # mounts all routers + /health
      auth.routes.js
      user.routes.js
      request.routes.js
      chat.routes.js
      notification.routes.js
      admin.routes.js
    middlewares/
      authenticate.js         # verifies JWT, loads user, checks ban
      authorizeRoles.js        # role-based access control
      errorHandler.js          # global error handler (last in stack)
      notFound.js               # 404 catch-all
      rateLimiter.js
      upload.js                # Multer + Cloudinary pipeline
      validate.js               # formats express-validator errors into ApiError
    services/
      tokenService.js           # generate/verify JWTs, cookie options
      emailService.js            # verify/reset email templates
    sockets/
      index.js                    # Socket.IO auth handshake + event handlers, kept out of server.js
    utils/
      ApiError.js
      ApiResponse.js
      asyncHandler.js
      constants.js               # enums, role names — single source of truth
```

**Separation rule:** `app.js` never calls `.listen()` and never touches
Socket.IO — that keeps it independently testable. `server.js` wires
`app.js` + HTTP server + Socket.IO together and is the only file that starts
the process.

## 3. Environment variables

`.env.example` must list every variable below with empty/placeholder values
— never real secrets.

**Required (server refuses to start without these):**
```
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=http://localhost:5173
```

**Optional (the corresponding feature must degrade gracefully if unset —
log a clear one-line warning at startup, don't crash, don't fake success):**
```
PORT=5000
NODE_ENV=development
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
```

Generate secrets with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

`config/env.js` must validate the required list at import time and throw/exit
with a message naming exactly which variable is missing.

## 4. Database models

### User (`users`)
| Field | Type | Rules |
|---|---|---|
| name | String | required, 2–50 chars |
| email | String | required, unique, lowercase, valid email format |
| password | String | min 6 chars, `select: false`, bcrypt hash (salt rounds: 12) |
| avatar | String | Cloudinary URL, default `""` |
| role | String | enum `["user","moderator","admin"]`, default `"user"` |
| bio | String | max 300 chars |
| skills | [String] | free-form tags |
| availability | String | enum `["available","busy","away"]` |
| location | GeoJSON | `{ type: "Point", coordinates: [lng, lat], address: String }` |
| googleId | String | for OAuth users, sparse unique |
| isEmailVerified | Boolean | default false |
| emailVerificationToken / Expires | String / Date | |
| passwordResetToken / Expires | String / Date | |
| refreshTokens | [String] | `select: false`, one per active device |
| isBanned | Boolean | default false |
| banReason | String | |
| requestsCount / volunteersCount | Number | denormalized, updated on create/delete |
| timestamps | | |

- Index: `location: "2dsphere"`, `googleId: 1` (sparse), `email` unique.
- Instance methods: `comparePassword(candidate)` → Boolean via bcrypt;
  `toPublicJSON()` → strips password, tokens, email-verification/reset
  fields before sending to the client.
- Pre-save hook hashes `password` only when it's been modified (don't
  re-hash an already-hashed password on unrelated updates).

### Request (`requests`)
| Field | Type | Rules |
|---|---|---|
| title | String | required, 5–100 chars |
| description | String | required, max 1000 chars |
| category | String | enum: tutoring, repair, medical, volunteers, moving, technology, gardening, pet_care, cooking, other |
| urgency | String | enum low/medium/high, default medium |
| status | String | enum open/in_progress/completed/closed, default open |
| images | [String] | Cloudinary URLs, max 4 |
| owner | ObjectId → User | required |
| acceptedVolunteer | ObjectId → User | default null |
| location | GeoJSON | same shape as User.location |
| volunteerCount | Number | default 0, incremented on each application |
| isReported | Boolean | default false |
| timestamps | | |

- Indexes: `location: "2dsphere"`, `{status:1, category:1}`, `owner:1`.

### Chat (`chats`)
`request` (ref, required, unique — one chat per request), `participants`
([ObjectId] ref User), `lastMessage` (ref Message), `lastMessageAt`.
Index: `participants:1`, unique index on `request:1`.

### Message (`messages`)
`chat` (ref, required), `sender` (ref, required), `text` (required, max
1000 chars), `isRead`, `readAt`. Index: `{chat:1, createdAt:1}`.

### Notification (`notifications`)
`recipient` (ref, required), `sender` (ref, nullable), `type` (enum:
new_volunteer, volunteer_accepted, volunteer_rejected, new_message,
request_completed, request_closed, system), `message` (required), `link`,
`isRead`, `data` (Mixed). Index: `{recipient:1, isRead:1, createdAt:-1}`.

### VolunteerApplication (`volunteerapplications`)
`request` (ref, required), `volunteer` (ref, required), `message` (max 300
chars), `status` (enum pending/accepted/rejected, default pending).
Unique compound index on `{request:1, volunteer:1}` — **this is what
prevents duplicate applications; it must actually exist as a DB-level
index, not just be checked in application code.**

## 5. API endpoints

Base URL: `/api/v1`. Auth via `Authorization: Bearer <accessToken>`.
Refresh token travels only as an httpOnly cookie, never in the JSON body.

```
GET  /health                                    -> {status:"ok"}

--- /auth  (rate limited: 200 / 15 min) ---
POST   /auth/register            {name,email,password}      -> {user, accessToken}
POST   /auth/login               {email,password}            -> {user, accessToken}
POST   /auth/logout              [auth]                       -> clears cookie + removes token from DB
POST   /auth/refresh-token       (cookie)                      -> {accessToken}
GET    /auth/verify-email/:token                               -> marks isEmailVerified
POST   /auth/forgot-password     {email}                       -> sends reset email (always 200, don't leak whether email exists)
PATCH  /auth/reset-password/:token {password}                  -> sets new password, invalidates token
GET    /auth/me                  [auth]                        -> current user (toPublicJSON)

--- /users  [auth required] ---
GET    /users/me
PATCH  /users/me                 {name?,bio?,availability?,skills?,location?}
PATCH  /users/me/avatar          multipart field=avatar
GET    /users/:id                                              -> public profile only
GET    /users/:id/requests

--- /requests  [auth required] ---
GET    /requests                 ?category=&status=&urgency=&page=&limit=
GET    /requests/nearby          ?lat=&lng=&distance=(km)
GET    /requests/my
GET    /requests/my/applications
POST   /requests                 multipart: title,description,category,urgency,lat,lng,address,images[]
GET    /requests/:id
PATCH  /requests/:id             (owner only)
DELETE /requests/:id             (owner only)
PATCH  /requests/:id/close       (owner only)
PATCH  /requests/:id/complete    (owner only)
POST   /requests/:id/volunteer   {message}                    -> creates VolunteerApplication
GET    /requests/:id/volunteers                                 -> owner sees all applications
PATCH  /requests/:id/volunteers/:appId/accept                    -> see lifecycle below

--- /chats  [auth required] ---
GET    /chats
GET    /chats/:id                                               -> chat + paginated messages
POST   /chats/:id/messages       {text}                          -> HTTP fallback for sending

--- /notifications  [auth required] ---
GET    /notifications            ?page=&limit=
GET    /notifications/unread-count
PATCH  /notifications/read-all
PATCH  /notifications/:id/read

--- /admin  [role: admin or moderator] ---
GET    /admin/stats
GET    /admin/users              ?search=&role=&page=&limit=
PATCH  /admin/users/:id/ban      [admin only] {reason}
PATCH  /admin/users/:id/unban    [admin only]
PATCH  /admin/users/:id/role     [admin only] {role}
GET    /admin/requests           ?category=&status=&page=
DELETE /admin/requests/:id       [admin or moderator]
```

**Definition of done for every endpoint:**
- Validates all input before hitting the DB; returns 422 with per-field
  errors on failure.
- Returns the standard response shape (`ApiResponse` / `ApiError`, see §8).
- List endpoints return `{ data, page, limit, total, totalPages }`.
- Ownership/role checks happen before any mutation — a user editing
  someone else's request must get 403, not silently succeed.
- Has at least one documented manual or automated test covering the happy
  path and the main failure path.

## 6. Auth flow

- **Register:** create user → hash password → send verification email (skip
  silently with a log line if SMTP isn't configured) → return `{user,
  accessToken}` and set httpOnly `refreshToken` cookie (7 days).
- **Login:** verify password with bcrypt → issue access (15m) + refresh (7d)
  tokens → push refresh token into `user.refreshTokens[]` → return
  `{user, accessToken}` + cookie.
- **Session restore (frontend, on every app load):** `GET /auth/me`. On 401,
  the frontend calls `/auth/refresh-token` using the cookie; if that
  succeeds, retry the original request; if it fails, force logout.
- **Logout:** remove the specific refresh token from `user.refreshTokens[]`,
  clear the cookie. Only that device is logged out — multi-device sessions
  stay intact.
- Access token payload: `{userId, role}`. Refresh token payload: `{userId}`.
  Never put anything sensitive in either payload — they are not encrypted,
  only signed.

## 7. Middleware stack (order matters — this exact order)

1. `helmet()`
2. `cors({ origin: CLIENT_URL, credentials: true })`
3. `express.json({ limit: "10mb" })`
4. `express.urlencoded({ extended: true, limit: "10mb" })`
5. `cookieParser()`
6. `morgan()` (dev format in development, combined in production)
7. `apiLimiter` (500 req / 15 min per IP) on `/api/*`
8. main router at `/api/v1`
9. `notFound` (404 for anything unmatched)
10. `errorHandler` (must be last — catches everything thrown/passed via `next(err)`)

Per-route middlewares: `authenticate` (verify Bearer token, load user,
reject if `isBanned`), `authorizeRoles(...roles)` (403 if role not allowed).

## 8. Standard response shapes

```js
// success
{ success: true, statusCode, data, message }

// error
{ success: false, statusCode, message, errors: [] }
```
Implement these as two small classes (`ApiResponse`, `ApiError`) used
consistently everywhere — no controller should hand-roll its own response
shape.

## 9. Socket.IO

Handshake: `{ auth: { token: "<accessToken>" } }` — reject the connection if
the token is missing/invalid, same validation logic as the HTTP
`authenticate` middleware (don't duplicate the JWT-verification code; import
the shared function).

```
Client -> Server:  join_chat {chatId} | leave_chat {chatId} |
                    send_message {chatId, text} | typing {chatId} |
                    stop_typing {chatId}

Server -> Client:  new_message <messageObject> | user_typing {userId} |
                    user_stop_typing {userId} | notification (fetch trigger) |
                    error {message}
```
Rooms: `socket.userId` (personal, for notifications), `chat:<chatId>`
(message + typing events). `send_message` must validate the sender is an
actual participant of that chat before persisting — don't trust the client.

## 10. Request lifecycle (implement exactly, including the side effects)

```
open -> in_progress -> completed
     -> closed
```
1. `POST /requests/:id/volunteer` → creates a `pending` VolunteerApplication
   (rejected with 409 if one already exists for this user+request) →
   notifies the request owner (`new_volunteer`).
2. Owner reviews via `GET /requests/:id/volunteers`.
3. `PATCH /requests/:id/volunteers/:appId/accept`:
   - accepted application → `status: "accepted"`
   - all other pending applications for that request → `status: "rejected"`
   - request → `status: "in_progress"`, `acceptedVolunteer` set
   - find-or-create the `Chat` for `{request, participants:[owner,volunteer]}`
   - send `volunteer_accepted` to the winner and `volunteer_rejected` to the
     others — all of this should succeed or fail together (wrap in a
     transaction or a clearly sequenced set of awaited steps with rollback
     on failure, not fire-and-forget).

## 11. Image uploads

Multer (memory storage, 5MB/file limit, images only, max 4 per request) →
buffer streamed to Cloudinary (folder `"goodgrid"`, `crop: "limit"`, max
width 800px) → `secure_url` saved to Mongo. If Cloudinary env vars are
unset, the upload endpoint must return a clear 503 explaining the feature is
disabled — not accept the upload and silently drop the image.

## 12. Geospatial

Both `User.location` and `Request.location` are `2dsphere`-indexed.
**Coordinates are always `[longitude, latitude]`** — comment this
explicitly at every place coordinates are read from the request body,
because reversing the order is the single most common bug in this project.

```js
{ location: { $near: {
    $geometry: { type: "Point", coordinates: [lng, lat] },
    $maxDistance: distanceInMeters
}}}
```

## 13. Security checklist (must all be true before calling the backend done)

- [ ] No secret values committed anywhere, including in seed scripts.
- [ ] All passwords bcrypt-hashed, `select: false` on the field.
- [ ] Refresh tokens: httpOnly cookie + revocable DB array, one entry per
      device.
- [ ] Every write route validated with express-validator.
- [ ] RBAC enforced via middleware, not ad-hoc `if (user.role === ...)`
      checks scattered in controllers.
- [ ] CORS restricted to `CLIENT_URL`, not `*`.
- [ ] `isBanned` checked on every authenticated request.
- [ ] Rate limiting active on `/api/*` and tighter on `/auth/*`.
- [ ] No verbose stack traces returned to the client in production
      (`NODE_ENV=production` hides internals; log them server-side instead).

## 14. Demo seed data

`node seed.js` (and `node seed.js --clear` to wipe first) creates 6 users (1
admin, 1 moderator, 4 regular), 8 requests across categories, 5 volunteer
applications. All demo accounts share one password so the student can log
in and manually verify every flow above.
