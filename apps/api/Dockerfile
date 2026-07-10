# syntax=docker/dockerfile:1

# Built from the repo root (see infra/docker/docker-compose.yml `context: ../..`)
# because this is a pnpm workspace — apps/api's lockfile lives at the root.

FROM node:26-alpine AS base
RUN apk add --no-cache python3 make g++ gcc
RUN npm i -g pnpm@11.10.0
WORKDIR /repo

FROM base AS build
# Copy only the manifests pnpm needs to resolve the workspace graph first,
# so `pnpm install` is cached and only reruns when a package.json or the
# lockfile actually changes — not on every source edit.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/ui-common/package.json ./packages/ui-common/package.json
# @boilerplate/contracts ships a built dist/, and the root "prepare" script
# builds it as part of `pnpm install` — so its source (not just the
# manifest) has to be present at install time too.
COPY packages/contracts ./packages/contracts
COPY tsconfig.base.json ./tsconfig.base.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm config set fetch-timeout 600000 \
  && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter api... build
# Prunes to production-only deps and resolves the workspace's symlinked
# node_modules into a flat, self-contained directory — plain `pnpm
# install --prod` can't do that for a single workspace package.
RUN pnpm --filter api deploy --prod --legacy /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/scripts/database ./scripts/database
COPY --from=build --chown=node:node /repo/apps/api/src/modules ./apps/api/src/modules
COPY --from=build --chown=node:node /repo/drizzle ./drizzle
COPY --from=build --chown=node:node /repo/scripts/generators/_lib ./scripts/generators/_lib
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
