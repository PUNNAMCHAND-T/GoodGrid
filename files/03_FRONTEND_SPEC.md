# GoodGrid — Frontend Specification (React / Vite)

Build this against the rules in `01_PRINCIPLES_AND_AI_AGENT_INSTRUCTIONS.md`.

> **Visual design is intentionally not in this document.** Colors,
> typography, spacing, and overall look are being researched separately.
> Everywhere a design decision would normally go, this spec instead says
> *where* it will plug in later, so the structure below never has to be
> rebuilt once the design is chosen — only `tailwind.config.js` and the
> component class names need to change.

---

## 1. Tech stack

React 18, Vite 5, Tailwind CSS 3 (utility classes only, no design tokens
chosen yet), Redux Toolkit, React Router DOM v6, Axios, Socket.IO Client 4,
React Hot Toast, React Leaflet + Leaflet (OpenStreetMap tiles — no API key
needed), date-fns.

## 2. Folder structure

```
client/
  index.html
  vite.config.js
  tailwind.config.js       # design tokens (colors/fonts) added here later
  postcss.config.js
  .env.example             # VITE_API_BASE_URL
  src/
    main.jsx                # ReactDOM.createRoot entry
    App.jsx                  # all routes defined here
    index.css                 # Tailwind layers only — no custom theme yet
    api/
      axiosInstance.js         # configured Axios + interceptors
      authService.js
      services.js               # every other API call, grouped by resource
      socketService.js            # Socket.IO client singleton
    app/
      store.js                    # Redux store: auth slice + ui slice
    features/
      authSlice.js
      uiSlice.js
    routes/
      ProtectedRoute.jsx           # redirect to /login if not authenticated
      PublicRoute.jsx               # redirect to /dashboard if authenticated
    layouts/
      AuthLayout.jsx                 # wraps login/register/forgot/reset pages
      DashboardLayout.jsx             # wraps everything behind auth
    components/
      common/
        Avatar.jsx
        Button.jsx
        Input.jsx
        Spinner.jsx
      layout/
        Navbar.jsx
    pages/
      Home/
      Login/
      Register/
      ForgotPassword/
      ResetPassword/
      Dashboard/
      Profile/
      Requests/
        Requests.jsx
        CreateRequest.jsx
        RequestDetail.jsx
        MyRequests.jsx
      MapView/
      Chat/
        ChatList.jsx
        ChatRoom.jsx
      Notifications/
      Admin/
      NotFound/
    utils/
      cn.js                          # class-merge helper (clsx or similar)
      constants.js                     # category/urgency/status enums — single source of truth, mirrors backend
      formatDate.js                     # date-fns wrappers
```

## 3. Routing table

| Path | Access | Layout |
|---|---|---|
| `/` | public | none (landing) |
| `/login`, `/register`, `/forgot-password`, `/reset-password/:token` | public-only (redirect if logged in) | AuthLayout |
| `/dashboard` | protected | DashboardLayout |
| `/profile`, `/profile/:id` | protected | DashboardLayout |
| `/requests`, `/requests/new`, `/requests/my`, `/requests/:id` | protected | DashboardLayout |
| `/map` | protected | DashboardLayout |
| `/chat`, `/chat/:id` | protected | DashboardLayout |
| `/notifications` | protected | DashboardLayout |
| `/admin` | protected + role admin/moderator | DashboardLayout |

`ProtectedRoute` and `PublicRoute` read `isAuthenticated` from the auth
slice — implement them as wrapper components around `<Outlet />`, not
copy-pasted checks inside every page.

## 4. Redux state shape

```js
// auth slice
{ user, accessToken, isAuthenticated, isLoading, error }
// thunks: registerUser, loginUser, logoutUser, fetchCurrentUser
// actions: setCredentials, logout, updateUser, setAccessToken, clearError

// ui slice
{ isSidebarOpen, isDarkMode, activeModal, notifications: { unreadCount } }
// actions: toggleSidebar, toggleDarkMode, openModal, closeModal,
//          setUnreadCount, incrementUnreadCount, resetUnreadCount
```

Keep server data (requests, chats, notifications lists) OUT of Redux unless
there's a real cross-page sharing need — fetch it where it's used and hold
it in local component state, so Redux doesn't become a second copy of the
database that goes stale. `unreadCount` in `ui` is the one exception,
because the navbar badge needs it everywhere.

## 5. API layer

- `axiosInstance.js`: base URL from `VITE_API_BASE_URL`, `withCredentials:
  true` (so the refresh-token cookie is sent), request interceptor attaches
  `Authorization: Bearer <accessToken>` from the Redux store.
- Response interceptor: on a 401, call `/auth/refresh-token` once, update
  the store, and retry the original request. If a second request also gets
  401, log the user out — don't loop forever. Queue concurrent 401s so five
  simultaneous requests don't trigger five refresh calls.
- `socketService.js`: a singleton that connects with `{ auth: { token } }`
  on login and disconnects on logout — never create more than one socket
  connection per session.

## 6. Page responsibilities (behavior, not visuals)

- **Home** — public landing content, links to login/register.
- **Login / Register** — form + validation, calls `authService`, redirects
  to `/dashboard` on success, surfaces field-level errors from the 422
  response.
- **ForgotPassword / ResetPassword** — email → token link flow matching the
  backend endpoints exactly.
- **Dashboard** — overview stats + recent activity for the logged-in user.
- **Profile** — view/edit own profile; view someone else's public profile at
  `/profile/:id` (no edit controls there).
- **Requests** — filterable list (category/status/urgency), pagination.
- **CreateRequest** — form incl. image upload (max 4) and location picker.
- **RequestDetail** — full request info; volunteer button for non-owners;
  applicant list + accept action for the owner.
- **MyRequests** — the user's own requests plus their own applications to
  others' requests.
- **MapView** — Leaflet map centered on the user's saved location, markers
  per nearby request, click → `/requests/:id`.
- **Chat / ChatList / ChatRoom** — list of chats, real-time message thread
  with typing indicators, HTTP fallback if the socket briefly drops.
- **Notifications** — feed with mark-read / mark-all-read.
- **Admin** — stats, user table with ban/role controls, request moderation
  table. Every action here must actually call the corresponding admin
  endpoint and reflect the real result — no locally-simulated state changes.

## 7. Where visual design will plug in later

When you finalize your design research, these are the only places that
should need to change:
- `tailwind.config.js` — theme colors, fonts, spacing scale.
- `index.css` — any custom CSS layer beyond Tailwind's defaults.
- The `className` strings inside `components/common/*` and page files.

Nothing in the routing, state management, or API layer above should need to
change when styling is added — if the agent finds itself restructuring
components to add design later, that's a sign the structure above wasn't
followed.

## 8. Definition of done for the frontend

- Every page above is wired to real backend data — no mock arrays left in
  component state "for now."
- Refresh/401 handling has been manually tested (e.g. by shortening the
  access token expiry temporarily and confirming a silent refresh happens).
- Every form shows real validation errors from the backend, not just
  client-side "required" checks.
- Sockets reconnect and rejoin the right rooms after a network drop.
