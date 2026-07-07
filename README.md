# Hotel Apartment Management System

Production-grade Hotel Apartment Management System for NuvraHub Digital Products & Solutions.

Client properties:

- Ndare Ecoville
- Property 2

Current implementation phase: Phase 2.

## Phase 2 Scope

Implemented:

- Monorepo structure with `backend` and `frontend` workspaces.
- Express TypeScript API foundation.
- MongoDB/Mongoose models for Phase 2 dashboard and auth flows.
- JWT access tokens and refresh token rotation.
- Forgot/reset password token flow.
- Role-based authorization.
- Property-scope middleware for multi-property isolation.
- Dashboard summary and owner portfolio endpoints.
- React TypeScript frontend with protected routes.
- Premium SaaS dashboard shell with light/dark mode.
- Login page, navigation, dashboard cards, chart, loading states, error states, and empty states.
- Seed script for Ndare Ecoville, Property 2, rooms, and an initial Owner user.

## Local Setup

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm --workspace backend run seed
npm run dev
```

Initial seeded owner:

```txt
owner@nuvrahub.com
ChangeMe123!
```

Change this password immediately in any real environment.

## Phase 3 Pending Approval

Next phase:

- Reservations
- Rooms
- Guests
- Check-in
- Check-out
