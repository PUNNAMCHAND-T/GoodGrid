# GoodGrid

GoodGrid is an open-source mutual aid and hyper-local community volunteering platform. It connects individuals requesting assistance (e.g., tutoring, household repairs, mobility help, pet care) with nearby volunteers.

The system features location-based request discovery using MongoDB geospatial indexing, real-time messaging via WebSockets, volunteer application workflows, and role-based access control.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Redux Toolkit, Tailwind CSS, Leaflet / React-Leaflet, Axios |
| **Backend** | Node.js (LTS), Express 5, Socket.IO, Mongoose |
| **Database** | MongoDB Atlas (Geospatial `2dsphere` indexes) |
| **Authentication** | JWT (short-lived access tokens + HTTP-only refresh tokens), bcryptjs |
| **File Storage** | Cloudinary (optional integration for image uploads) |
| **Mailing** | Nodemailer / SMTP (optional integration for transactional emails) |

---

## Architecture & Design Decisions

- **Geospatial Queries**: Requests store coordinates using the GeoJSON `Point` format (`[longitude, latitude]`). The backend utilizes MongoDB's `$near` operator on a `2dsphere` index to query open requests within configurable distances.
- **Dual-Token Authentication**: Access tokens expire in 15 minutes and are passed via the `Authorization: Bearer` header. Refresh tokens are persisted in the database and issued inside secure, `httpOnly`, `sameSite` cookies.
- **Real-time Synchronization**: Socket.IO handles bi-directional events for in-app direct messaging and real-time request status changes, with fallback mechanisms to standard HTTP endpoints.
- **Role-Based Access Control (RBAC)**: Enforced via route-level middleware supporting `user`, `moderator`, and `admin` permissions.

---

## Project Structure

```
goodgrid/
├── client/                     # Frontend client (Vite SPA)
│   ├── src/
│   │   ├── api/                # Axios instance and socket service
│   │   ├── components/         # Reusable UI components
│   │   ├── features/           # Redux slices (auth, ui)
│   │   ├── pages/              # Route views (Auth, Requests, Chat, Admin, Profile)
│   │   └── utils/              # Helper functions and constants
│   ├── .env.example
│   └── package.json
├── server/                     # Backend API server
│   ├── src/
│   │   ├── config/             # Environment validation and database configuration
│   │   ├── controllers/        # Route controllers
│   │   ├── middlewares/        # Authentication, validation, and error handling
│   │   ├── models/             # Mongoose schemas (User, Request, Application, Chat)
│   │   ├── routes/             # Express API route declarations
│   │   ├── services/           # Token management and email delivery
│   │   └── sockets/            # Socket.IO connection and room handlers
│   ├── .env.example
│   ├── seed.js                 # Database seeder for demo accounts & mock requests
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- A running MongoDB Atlas cluster or local MongoDB instance

---

### 1. Server Configuration

Navigate to the `server/` directory and install dependencies:

```bash
cd server
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your environment variables in `server/.env`:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Yes | 64-character secret for access token signing |
| `JWT_REFRESH_SECRET` | Yes | 64-character secret for refresh token signing |
| `CLIENT_URL` | Yes | Frontend client URL (default: `http://localhost:5173`) |
| `PORT` | No | API port (default: `5000`) |
| `NODE_ENV` | No | Environment mode (`development` / `production`) |
| `CLOUDINARY_*` | No | Cloudinary credentials for image uploads |
| `SMTP_*` | No | SMTP credentials for email delivery |

Seed the database with initial demo data:

```bash
node seed.js
```

Start the backend server in development mode:

```bash
npm run dev
```

The server starts on `http://localhost:5000`. You can test health status at `http://localhost:5000/api/v1/health`.

---

### 2. Client Configuration

Navigate to the `client/` directory and install dependencies:

```bash
cd ../client
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Ensure `client/.env` targets the backend API URL:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Start the development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## Pre-Seeded Accounts

The database seeder (`seed.js`) provides pre-configured accounts for testing different platform roles. All accounts share the same password:

**Password**: `Password123`

| Email | Role | Notes |
| :--- | :--- | :--- |
| `admin@goodgrid.com` | `admin` | Full administrative permissions |
| `mod@goodgrid.com` | `moderator` | Moderation rights on requests and reports |
| `alice@goodgrid.com` | `user` | Account with existing requests |
| `bob@goodgrid.com` | `user` | Active volunteer account |
| `carol@goodgrid.com` | `user` | Volunteer with medical / first-aid profile |
| `dave@goodgrid.com` | `user` | Volunteer with handiwork / repair skills |

---

## API Overview

All API endpoints are prefixed with `/api/v1`:

| Route Prefix | Description | Auth Required |
| :--- | :--- | :--- |
| `/auth` | Register, login, refresh token, logout, OAuth | No (except logout/refresh) |
| `/users` | User profile retrieval, profile updates, avatar uploads | Yes |
| `/requests` | CRUD operations for requests, nearby search, filtering | Mixed (public browse, protected create/update) |
| `/volunteers`| Apply for requests, accept/reject volunteers, manage applications | Yes |
| `/chat` | Direct messaging rooms, conversation history | Yes |
| `/admin` | User management, request moderation, system metrics | Yes (`admin`/`moderator` only) |
| `/health` | Server and database liveness probe | No |

---

## License

This project is licensed under the [MIT License](LICENSE).
