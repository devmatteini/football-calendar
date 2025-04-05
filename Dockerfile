FROM node:22-alpine AS base
RUN npm install --global pnpm
WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY . .
ENV NODE_ENV=production
RUN pnpm run build

FROM node:22-alpine
COPY --from=build /app/.build/football-calendar /usr/local/bin
ENV NODE_NO_WARNINGS=1
USER node
CMD [ "node", "/usr/local/bin/football-calendar", "sync" ]
