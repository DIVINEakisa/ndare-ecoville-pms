# Architecture Notes

The HMS is a TypeScript monorepo with:

- `backend`: Express, MongoDB, Mongoose, JWT auth, RBAC, property scope enforcement.
- `frontend`: React, React Router, TanStack Query, Tailwind CSS.

Every operational collection is property-owned. Backend routes attach a `propertyScope` after authentication, and services/repositories include that scope in reads and writes.

Owner and Admin can aggregate across properties. Staff users operate only within assigned properties.

Core request flow:

```txt
Route -> Validate -> Authenticate -> Attach Property Scope -> Authorize -> Controller -> Service -> Model
```

The frontend uses route-level code splitting and query caching. Heavy chart dependencies are split into separate Vite chunks.
