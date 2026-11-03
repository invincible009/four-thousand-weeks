# Stage 1: Build the Angular app
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve the app with Nginx unprivileged / lightweight
FROM nginx:alpine

COPY --from=builder /app/dist/four-thousand-weeks/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

