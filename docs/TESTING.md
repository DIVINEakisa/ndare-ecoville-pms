# Testing Guide

Run the verification suite:

```bash
npm run typecheck
npm run test
npm run build
npm audit --omit=dev
```

Current automated tests cover:

- Role permission behavior
- Pagination bounds and metadata
- CSV report response generation

Recommended next test expansion:

- Auth integration tests with an in-memory MongoDB test database
- Reservation double-booking integration tests
- Requisition approval and stock deduction integration tests
- Frontend component tests for forms and route guards
