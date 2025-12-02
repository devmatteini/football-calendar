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
RUN apk add --no-cache curl
LABEL org.opencontainers.image.source=https://github.com/devmatteini/football-calendar
LABEL org.opencontainers.image.description="Automatically sync your google calendar with football matches of your favorite team!"
LABEL org.opencontainers.image.licenses=MIT
COPY --from=build /app/dist/football-calendar /usr/local/bin
ENV NODE_NO_WARNINGS=1
USER node
ENTRYPOINT [ "node", "/usr/local/bin/football-calendar" ]
