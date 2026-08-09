# Etapa 1: compilar el frontend
FROM node:20-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Etapa 2: backend
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ ./backend/
COPY --from=frontend /build/dist ./frontend/dist
EXPOSE 3000
CMD ["node", "backend/server.js"]
