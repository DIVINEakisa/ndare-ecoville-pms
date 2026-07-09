# Deployment Guide

## Required Environment

- Node.js 24 LTS-compatible runtime
- MongoDB 7+
- SMTP credentials for production email delivery
- HTTPS termination at the load balancer or reverse proxy

## Backend

Copy `backend/.env.example` to `backend/.env` and set production values:

```txt
NODE_ENV=production
MONGODB_URI=
CLIENT_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

Use long random JWT secrets. Rotate them with a planned session invalidation window.

## Docker Compose

```bash
docker compose up --build -d
docker compose exec backend npm --workspace backend run seed
```

Frontend: `http://localhost:8080`

Backend health: `http://localhost:5000/health`

## Production Checklist

- Serve frontend and backend over HTTPS.
- Restrict MongoDB to private network access.
- Configure SMTP and Cloudinary credentials through secret storage.
- Run `npm audit --omit=dev` during CI.
- Run `npm run typecheck`, `npm run test`, and `npm run build` before deployment.
- Back up MongoDB daily and test restore procedures.
- Change the seeded owner password immediately after first login.
