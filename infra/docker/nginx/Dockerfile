# syntax=docker/dockerfile:1

FROM node:26-alpine AS web-build
RUN apk add --no-cache python3 make g++ gcc
RUN npm i -g pnpm@11.10.0
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/ui-common/package.json ./packages/ui-common/package.json
COPY packages/contracts ./packages/contracts
COPY tsconfig.base.json ./tsconfig.base.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm config set fetch-timeout 600000 \
  && pnpm install --frozen-lockfile
COPY . .
ENV VITE_API_URL=/api/v1
RUN pnpm --filter web... build

FROM nginx:1.31-alpine
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
