# Hotel Apartment Management System

Production-grade Hotel Apartment Management System for NuvraHub Digital Products & Solutions.

Client properties:

- Ndare Ecoville
- Property 2

Current implementation phase: Phase 7 complete.

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

## Phase 3 Scope

Implemented:

- Rooms API with scoped listing, creation, update, availability checks, and room status support.
- Guests API with scoped listing, creation, and update.
- Reservations API with listing, creation, update, populated guest/room data, and double-booking prevention.
- Check-in API that updates guest document/emergency data, marks the reservation checked in, occupies the room, creates/updates the folio, and records optional payment.
- Check-out API that records optional final payment, blocks checkout with outstanding balance, settles the folio, marks the reservation checked out, and releases the room.
- Frontend Rooms page with filters, creation form, table, loading, error-ready, and empty states.
- Frontend Guests page with filters, creation form, table, loading, error-ready, and empty states.
- Frontend Reservations page with property/guest/room selection and booking creation.
- Frontend Check-in page with document, emergency contact, and payment capture.
- Frontend Check-out page with final payment capture.
- Route-level code splitting for Phase 3 pages.

## Phase 4 Scope

Implemented:

- Menu category and menu item models, indexes, validation, services, controllers, and routes.
- Folio item model for traceable restaurant charges posted to guest folios.
- Restaurant order API with checked-in guest enforcement.
- Kitchen queue API flow with status transitions: Received, Preparing, Ready, Delivered, Cancelled.
- Delivered restaurant orders automatically post to the guest folio once.
- Public guest portal API for active room stays.
- Guest portal order endpoint for QR ordering without staff authentication.
- Seed menu categories and items for both properties.
- Restaurant management page with menu setup, manual ordering, recent orders, and room QR links.
- Kitchen queue page with operational status lanes.
- Mobile-first guest portal with menu ordering, live bill, WiFi, house rules, emergency contacts, and review/service surfaces.

## Phase 5 Scope

Implemented:

- Inventory items with categories, quantity on hand, low-stock thresholds, suppliers, and property scope.
- Stock movement tracking for purchase, issue, adjustment, and requisition flows.
- Low-stock notifications created automatically when stock reaches threshold.
- Requisition model and workflow: Pending, Approved, Rejected, Received.
- Requisition approval, rejection, and receiving APIs.
- Receiving an approved requisition issues stock and records stock movements.
- Notification center API with unread counts and mark-as-read support.
- Inventory page with filters, low-stock toggle, creation form, and quick stock updates.
- Requisitions page with request creation and approval/receive actions.
- Notifications page with unread state and read action.
- Seed inventory records for both properties.

## Phase 6 Scope

Implemented:

- Reports API aggregating revenue, payment methods, reservation status, occupancy, restaurant sales, low stock, and outstanding folios.
- CSV export for report summaries.
- Settings model and property-scoped settings API.
- Email template model and API.
- Seeded default property settings and receipt email template.
- Reports page with filters, KPI cards, charts, and CSV export.
- Settings page with property configuration and email template editing.

## Phase 7 Scope

Implemented:

- Backend unit test script and initial tests for permissions, pagination, and CSV report export.
- Authenticated CSV report download in the frontend.
- Vite manual chunking for React, query/Axios, and charts.
- Dockerfiles for backend and frontend.
- Nginx SPA configuration for frontend deployment.
- Docker Compose stack with MongoDB, backend, and frontend services.
- Deployment, testing, and architecture documentation.

## Verification

```bash
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

## Deployment Docs

- `docs/DEPLOYMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`

## Project Status

All planned implementation phases are complete.
