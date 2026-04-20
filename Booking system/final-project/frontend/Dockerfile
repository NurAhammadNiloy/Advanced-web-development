# -----------------------------
# Stage 1: Build React app
# -----------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build


# -----------------------------
# Stage 2: Nginx server
# -----------------------------
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
