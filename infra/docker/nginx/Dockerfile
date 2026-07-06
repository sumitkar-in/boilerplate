# syntax=docker/dockerfile:1

FROM node:24-alpine AS web-build
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
ENV VITE_API_URL=/api/v1
RUN pnpm --filter web... build

FROM nginx:1.27-alpine
# Fallback certs baked into the image, used only if the host doesn't mount
# infra/docker/nginx/certs (see setup.sh, which generates locally-trusted
# mkcert certs there). Browsers won't trust this fallback pair.
RUN apk add --no-cache openssl \
  && mkdir -p /etc/nginx/certs \
  && openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -keyout /etc/nginx/certs/self-signed.key \
    -out /etc/nginx/certs/self-signed.crt \
    -subj "/C=US/ST=Local/L=Local/O=Boilerplate/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
COPY infra/docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=web-build /repo/apps/web/dist /usr/share/nginx/html
