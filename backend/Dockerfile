FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/
RUN npm ci --workspace backend
COPY backend backend
RUN npm --workspace backend run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY backend/package*.json backend/
RUN npm ci --omit=dev --workspace backend
COPY --from=build /app/backend/dist backend/dist
COPY backend/.env.example backend/.env.example
EXPOSE 5000
CMD ["npm", "--workspace", "backend", "run", "start"]
