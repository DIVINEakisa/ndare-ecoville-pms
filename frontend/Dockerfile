FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json frontend/
RUN npm ci --workspace frontend
COPY frontend frontend
RUN npm --workspace frontend run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
